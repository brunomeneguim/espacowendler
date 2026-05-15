"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── helpers ───────────────────────────────────────────────────────────────────

const FORMAS = ["pix", "cartao_credito", "cartao_debito", "dinheiro"] as const;
function forma(seed: number) { return FORMAS[Math.abs(seed) % FORMAS.length]; }

/** N-ésimo dia útil a partir de hoje (negativo = passado) */
function businessDay(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (n === 0) return d;
  const dir = n > 0 ? 1 : -1;
  let rem = Math.abs(n);
  while (rem > 0) {
    d.setDate(d.getDate() + dir);
    if (d.getDay() !== 0 && d.getDay() !== 6) rem--;
  }
  return d;
}

function dateStr(n: number): string {
  return businessDay(n).toISOString().split("T")[0];
}

function appt(
  profId: string,
  pacId: string,
  bd: number,
  hour: number,
  dur: number,
  status: string,
  pago: boolean,
  valor?: number,
  salaId?: number | null,
  aluguelValor: number = 50,
): Record<string, unknown> {
  const start = businessDay(bd);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + dur * 60000);
  // Aluguel cobrado apenas quando o atendimento foi pago e há sala vinculada
  const cobrarAluguel = pago && salaId != null;
  return {
    profissional_id: profId,
    paciente_id: pacId,
    data_hora_inicio: start.toISOString(),
    data_hora_fim: end.toISOString(),
    status,
    pago,
    forma_pagamento: pago ? forma(bd + hour) : null,
    valor_sessao: pago ? (valor ?? null) : null,
    tipo_agendamento: "consulta_avulsa",
    quantidade_sessoes: 1,
    sala_id: salaId ?? null,
    aluguel_cobrado: cobrarAluguel,
    aluguel_valor: cobrarAluguel ? aluguelValor : null,
  };
}

// ── LIMPAR BANCO DE DADOS ─────────────────────────────────────────────────────

export async function limparBancoDados(): Promise<{ error?: string; message?: string }> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return { error: "Acesso negado." };

  // Usar o client autenticado (JWT do admin via cookie) para que as
  // políticas RLS reconheçam o role 'admin' e permitam os DELETEs.
  const supabase = createClient();
  const errs: string[] = [];

  async function del(table: string, numericPk = false) {
    const q = numericPk
      ? (supabase as any).from(table).delete().gt("id", 0)
      : (supabase as any).from(table).delete().not("id", "is", null);
    const { error } = await q;
    if (error) errs.push(`${table}: ${error.message}`);
  }

  // Ordem segura respeitando FKs
  await del("lancamentos");
  await del("lembretes_aniversario", true);
  await del("paciente_profissional", true);
  await del("lista_encaixe");
  await del("agendamentos");                       // ausência (paciente_id null) também
  await del("postits");
  await del("tarefas");
  await del("planner_tarefas");
  await (supabase as any).from("planner_compartilhamentos").delete().not("planner_id", "is", null);
  await del("planners");
  await del("pacientes");

  // Deletar profiles não-admin → cascata em profissionais, horarios_disponiveis, etc.
  const { error: profileErr } = await (supabase as any)
    .from("profiles")
    .delete()
    .neq("id", profile.id);
  if (profileErr) errs.push(`profiles: ${profileErr.message}`);

  revalidatePath("/", "layout");

  // Se alguma tabela falhou, reportar erro real
  if (errs.length > 0) {
    console.error("[Sistema] Erros ao limpar tabelas:", errs);
    const resumo = errs.slice(0, 3).join(" | ");
    return { error: `Erro ao limpar dados: ${resumo}` };
  }

  // Tentar remover auth.users via service role (best-effort — não bloqueia o sucesso)
  let authNote = "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const admin = createAdminClient();
      const { data: allUsers, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) {
        console.warn("[Sistema] auth.listUsers falhou:", listErr.message);
        authNote = " Contas de login não removidas (erro no auth).";
      } else {
        for (const u of allUsers?.users ?? []) {
          if (u.id !== profile.id) {
            await admin.auth.admin.deleteUser(u.id);
          }
        }
        authNote = " Contas de acesso também removidas.";
      }
    } catch (e: any) {
      console.warn("[Sistema] auth cleanup exception:", e?.message);
      authNote = " Contas de login não removidas (verifique o Supabase Dashboard).";
    }
  }

  return { message: `Banco de dados limpo com sucesso.${authNote}` };
}

// ── POPULAR BANCO DE DADOS ────────────────────────────────────────────────────

export async function popularBancoDados(): Promise<{
  error?: string;
  message?: string;
  stats?: Record<string, number>;
}> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return { error: "Acesso negado." };

  // Popular requer service role key para criar usuários no auth
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY não está configurada no .env.local. " +
        "Adicione a chave do painel Supabase → Project Settings → API → service_role.",
    };
  }

  const admin = createAdminClient();
  const stats: Record<string, number> = {};

  // Verificar se já há profissionais
  const { count } = await admin
    .from("profissionais")
    .select("id", { count: "exact", head: true });
  if (count && count > 0) {
    return { error: "Já existem profissionais cadastrados. Limpe o banco antes de popular novamente." };
  }

  // ── 1. Profissionais ───────────────────────────────────────────────────────
  const profsSeed = [
    {
      email: "rafael.mendes@example.com",
      nome: "Rafael Mendes Santos",
      cor: "blue",
      valor_consulta: 180,
      valor_plano: 750,
      valor_aluguel_sala: 50,
      tempo_atendimento: 50,
      especialidade_id: 1,
      registro: "CRP 06/12345",
      cpf: "123.456.789-00",
      data_nascimento: "1985-03-15",
      sexo: "masculino",
      telefone: "+5511987654321",
    },
    {
      email: "camila.rocha@example.com",
      nome: "Camila Rocha Oliveira",
      cor: "emerald",
      valor_consulta: 150,
      valor_plano: 600,
      valor_aluguel_sala: 50,
      tempo_atendimento: 50,
      especialidade_id: 3,
      registro: "CRN 3/45678",
      cpf: "234.567.890-11",
      data_nascimento: "1990-07-22",
      sexo: "feminino",
      telefone: "+5511976543210",
    },
    {
      email: "lucas.ferreira@example.com",
      nome: "Lucas Ferreira Costa",
      cor: "orange",
      valor_consulta: 120,
      valor_plano: 480,
      valor_aluguel_sala: 50,
      tempo_atendimento: 40,
      especialidade_id: 4,
      registro: "CREFITO-3/12345-F",
      cpf: "345.678.901-22",
      data_nascimento: "1988-11-08",
      sexo: "masculino",
      telefone: "+5511965432109",
    },
  ];

  const createdProfs: { id: string; profileId: string }[] = [];

  for (const pd of profsSeed) {
    // Tentar criar usuário no auth
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: pd.email,
      password: "Demo@2024!",
      email_confirm: true,
      user_metadata: { nome_completo: pd.nome },
    });

    let uid: string | null = null;

    if (authErr || !authData?.user) {
      console.error(`[seed] createUser(${pd.email}):`, authErr?.message);
      // Email já existe no auth (limpar não conseguiu remover a conta)?
      // Localizar o usuário existente pelo email.
      const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) {
        console.error(`[seed] listUsers falhou:`, listErr.message);
        continue;
      }
      const found = listed?.users?.find((u: any) => u.email === pd.email);
      if (!found) {
        console.error(`[seed] usuário ${pd.email} não encontrado mesmo após listUsers`);
        continue;
      }
      uid = found.id;
      // Redefinir senha e metadata para que o login demo funcione
      await admin.auth.admin.updateUserById(uid, {
        password: "Demo@2024!",
        user_metadata: { nome_completo: pd.nome },
      });
    } else {
      uid = authData.user.id;
    }

    // Upsert profile — pode ter sido removido pelo "Limpar banco"
    await admin
      .from("profiles")
      .upsert({ id: uid, nome_completo: pd.nome, role: "profissional", telefone: pd.telefone });

    const { data: prof, error: profErr } = await admin
      .from("profissionais")
      .insert({
        profile_id: uid,
        cor: pd.cor,
        valor_consulta: pd.valor_consulta,
        valor_plano: pd.valor_plano,
        valor_aluguel_sala: pd.valor_aluguel_sala,
        tempo_atendimento: pd.tempo_atendimento,
        registro_profissional: pd.registro,
        cpf: pd.cpf,
        data_nascimento: pd.data_nascimento,
        sexo: pd.sexo,
        telefone_1: pd.telefone,
        ativo: true,
        perfil_completo: true,
        horario_inicio: "08:00",
        horario_fim: "18:00",
      })
      .select("id")
      .single();

    if (profErr || !prof) {
      console.error(`[seed] profissional(${pd.nome}):`, profErr?.message);
      continue;
    }

    await admin
      .from("profissional_especialidades")
      .insert({ profissional_id: prof.id, especialidade_id: pd.especialidade_id });

    await admin.from("horarios_disponiveis").insert(
      [1, 2, 3, 4, 5].map((dia) => ({
        profissional_id: prof.id,
        dia_semana: dia,
        hora_inicio: "08:00",
        hora_fim: "18:00",
      })),
    );

    createdProfs.push({ id: prof.id, profileId: uid });
  }

  stats.profissionais = createdProfs.length;
  if (createdProfs.length < 2) {
    return { error: "Falha ao criar profissionais. Verifique os logs do servidor." };
  }

  const rf = createdProfs[0].id; // Rafael
  const ca = createdProfs[1].id; // Camila
  const lu = createdProfs[2]?.id ?? createdProfs[1].id; // Lucas
  // valor_aluguel_sala de cada profissional (definido em profsSeed acima)
  const aluguelRf = 50;
  const aluguelCa = 50;
  const aluguelLu = 50;

  // ── 2. Pacientes ──────────────────────────────────────────────────────────
  const pacientesSeed = [
    // 0 – Rafael
    { nome_completo: "Maria das Graças Silva", telefone: "+5511991234567", email: "maria.gracas@email.com", cpf: "111.222.333-44", data_nascimento: "1979-04-15", inicio_tratamento: "2025-01-08", valor_consulta_especial: 160 },
    // 1 – Rafael + Camila
    { nome_completo: "João Pedro Almeida", telefone: "+5511992345678", email: "joao.pedro.almeida@email.com", cpf: "222.333.444-55", data_nascimento: "1993-11-22", inicio_tratamento: "2025-02-03" },
    // 2 – Rafael
    { nome_completo: "Ana Beatriz Rodrigues", telefone: "+5511993456789", email: "ana.beatriz.r@email.com", cpf: "333.444.555-66", data_nascimento: "1997-07-08", inicio_tratamento: "2025-03-10" },
    // 3 – Lucas
    { nome_completo: "Carlos Eduardo Souza", telefone: "+5511994567890", email: "carlos.e.souza@email.com", cpf: "444.555.666-77", data_nascimento: "1970-09-30", inicio_tratamento: "2024-11-15", valor_consulta_especial: 100 },
    // 4 – Camila
    { nome_completo: "Fernanda Lima Martins", telefone: "+5511995678901", email: "fernanda.lima.m@email.com", cpf: "555.666.777-88", data_nascimento: "1987-01-25", inicio_tratamento: "2025-01-20" },
    // 5 – Rafael
    { nome_completo: "Roberto Aparecido Santos", telefone: "+5511996789012", email: "roberto.a.santos@email.com", cpf: "666.777.888-99", data_nascimento: "1983-06-14", inicio_tratamento: "2024-10-07" },
    // 6 – Lucas
    { nome_completo: "Juliana Menezes Pereira", telefone: "+5511997890123", email: "juliana.menezes@email.com", cpf: "777.888.999-00", data_nascimento: "2000-03-18", inicio_tratamento: "2025-04-01" },
    // 7 – Rafael
    { nome_completo: "Diego Henrique Barbosa", telefone: "+5511998901234", email: "diego.barbosa@email.com", cpf: "888.999.000-11", data_nascimento: "1991-12-05", inicio_tratamento: "2025-04-14" },
    // 8 – Camila
    { nome_completo: "Patrícia Gonçalves Araújo", telefone: "+5511999012345", email: "patricia.araujo@email.com", cpf: "999.000.111-22", data_nascimento: "1978-08-20", inicio_tratamento: "2024-09-12", valor_consulta_especial: 140 },
    // 9 – Lucas
    { nome_completo: "Marcos Antônio Carvalho", telefone: "+5511981234560", email: "marcos.a.carvalho@email.com", cpf: "000.111.222-33", data_nascimento: "1964-05-03", inicio_tratamento: "2024-12-09" },
    // 10 – Camila
    { nome_completo: "Beatriz Santos Lima", telefone: "+5511982345671", email: "beatriz.s.lima@email.com", cpf: "111.333.555-77", data_nascimento: "2003-09-14", inicio_tratamento: "2025-05-05" },
    // 11 – Lucas
    { nome_completo: "Thiago Rezende Campos", telefone: "+5511983456782", email: "thiago.campos@email.com", cpf: "222.444.666-88", data_nascimento: "1995-02-28", inicio_tratamento: "2025-03-25" },
  ];

  const { data: insP, error: pErr } = await admin
    .from("pacientes")
    .insert(pacientesSeed.map((p) => ({ ...p, ativo: true })))
    .select("id");
  if (pErr || !insP) return { error: `Erro ao criar pacientes: ${pErr?.message}` };
  stats.pacientes = insP.length;
  const p = (insP as { id: string }[]).map((x) => x.id);

  // Vínculos paciente↔profissional
  const vincPP: { paciente_id: string; profissional_id: string }[] = [];
  const rafaelPacs = [0, 2, 5, 7];
  const camilaPacs = [1, 4, 8, 10];
  const lucasPacs  = [3, 6, 9, 11];
  rafaelPacs.forEach((i) => vincPP.push({ paciente_id: p[i], profissional_id: rf }));
  camilaPacs.forEach((i) => vincPP.push({ paciente_id: p[i], profissional_id: ca }));
  lucasPacs.forEach((i)  => vincPP.push({ paciente_id: p[i], profissional_id: lu }));
  vincPP.push({ paciente_id: p[1], profissional_id: rf }); // João é de Rafael também

  const { error: vincErr } = await admin.from("paciente_profissional").insert(vincPP);
  if (vincErr) {
    console.error("[seed] paciente_profissional insert:", vincErr.message, vincErr);
    // Tentar inserir um por um para isolar o problema
    let vincOk = 0;
    for (const v of vincPP) {
      const { error: e2 } = await admin.from("paciente_profissional").insert(v);
      if (e2) console.error(`[seed] vinculo ${v.paciente_id}↔${v.profissional_id}:`, e2.message);
      else vincOk++;
    }
    stats.vinculos = vincOk;
  } else {
    stats.vinculos = vincPP.length;
  }

  // ── 3. Salas ──────────────────────────────────────────────────────────────
  // Buscar salas existentes; criar padrão se não houver nenhuma
  const { data: salasExist } = await admin
    .from("salas")
    .select("id")
    .eq("ativo", true)
    .order("id");

  let sala1: number | null = salasExist?.[0]?.id ?? null;
  let sala2: number | null = salasExist?.[1]?.id ?? null;
  let sala3: number | null = salasExist?.[2]?.id ?? null;

  if (!sala1) {
    // Nenhuma sala cadastrada — criar 3 salas padrão
    const { data: newSalas, error: salaErr } = await admin
      .from("salas")
      .insert([
        { nome: "Sala 1", ativo: true, ordem: 0 },
        { nome: "Sala 2", ativo: true, ordem: 1 },
        { nome: "Sala 3", ativo: true, ordem: 2 },
      ])
      .select("id");
    if (salaErr) console.error("[seed] salas:", salaErr.message);
    sala1 = newSalas?.[0]?.id ?? null;
    sala2 = newSalas?.[1]?.id ?? null;
    sala3 = newSalas?.[2]?.id ?? null;
    stats.salas = newSalas?.length ?? 0;
  }

  // Se ainda não há salas suficientes, reutilizar a que existir
  if (!sala2) sala2 = sala1;
  if (!sala3) sala3 = sala2;

  // ── 4. Agendamentos ───────────────────────────────────────────────────────
  // Cada profissional usa sua própria sala exclusiva para não conflitar horários
  const A: Record<string, unknown>[] = [];

  // ── Rafael — Sala 1 (Psicólogo, 50min) ────────────────────────────────────
  // Maria das Graças (valor especial R$160) – semanal, seg
  for (let w = 8; w >= 1; w--) {
    A.push(appt(rf, p[0], -(w * 5),     9,  50, "realizado",  true,  160, sala1, aluguelRf));
  }
  // Ana Beatriz – semanal, ter
  for (let w = 8; w >= 1; w--) {
    const isFaltou = w === 4;
    A.push(appt(rf, p[2], -(w * 5) + 1, 10, 50, isFaltou ? "faltou" : "realizado", !isFaltou, 180, sala1, aluguelRf));
  }
  // Roberto – quinzenal, qui
  [-(10 * 4) + 3, -(10 * 3) + 3, -(10 * 2) + 3, -10 + 3].forEach((bd) =>
    A.push(appt(rf, p[5], bd, 14, 50, "realizado", true, 180, sala1, aluguelRf)),
  );
  // Diego – recente (3 sessões passadas), sex
  [-15 + 4, -10 + 4, -5 + 4].forEach((bd) =>
    A.push(appt(rf, p[7], bd, 15, 50, "realizado", true, 180, sala1, aluguelRf)),
  );
  // Cancelado
  A.push(appt(rf, p[1], -8, 11, 50, "cancelado", false, undefined, sala1, aluguelRf));

  // Rafael – Futuros
  A.push(appt(rf, p[0], 1,  9,  50, "confirmado", false, undefined, sala1, aluguelRf));
  A.push(appt(rf, p[2], 2,  10, 50, "agendado",   false, undefined, sala1, aluguelRf));
  A.push(appt(rf, p[7], 2,  15, 50, "agendado",   false, undefined, sala1, aluguelRf));
  A.push(appt(rf, p[5], 4,  14, 50, "agendado",   false, undefined, sala1, aluguelRf));
  A.push(appt(rf, p[0], 6,  9,  50, "agendado",   false, undefined, sala1, aluguelRf));
  A.push(appt(rf, p[2], 7,  10, 50, "agendado",   false, undefined, sala1, aluguelRf));
  A.push(appt(rf, p[7], 7,  15, 50, "agendado",   false, undefined, sala1, aluguelRf));
  A.push(appt(rf, p[5], 9,  14, 50, "agendado",   false, undefined, sala1, aluguelRf));

  // ── Camila — Sala 2 (Nutricionista, 50min) ─────────────────────────────────
  // Fernanda – quinzenal, seg
  [-(10 * 3), -(10 * 2), -10, -5].forEach((bd) =>
    A.push(appt(ca, p[4], bd, 9, 50, "realizado", true, 150, sala2, aluguelCa)),
  );
  // Patrícia (valor especial R$140) – mensal, ter
  [-42 + 1, -22 + 1].forEach((bd) =>
    A.push(appt(ca, p[8], bd, 10, 50, "realizado", true, 140, sala2, aluguelCa)),
  );
  // João Pedro – quinzenal, qui, faltou na mais recente
  [-30 + 3, -17 + 3, -7 + 3].forEach((bd, i) =>
    A.push(appt(ca, p[1], bd, 14, 50, i === 2 ? "faltou" : "realizado", i !== 2, 150, sala2, aluguelCa)),
  );
  // Beatriz Santos – nova, sex
  A.push(appt(ca, p[10], -4, 11, 50, "realizado", true, 150, sala2, aluguelCa));

  // Camila – Futuros
  A.push(appt(ca, p[4],  1, 9,  50, "confirmado", false, undefined, sala2, aluguelCa));
  A.push(appt(ca, p[10], 1, 11, 50, "agendado",   false, undefined, sala2, aluguelCa));
  A.push(appt(ca, p[1],  3, 14, 50, "agendado",   false, undefined, sala2, aluguelCa));
  A.push(appt(ca, p[4],  6, 9,  50, "agendado",   false, undefined, sala2, aluguelCa));
  A.push(appt(ca, p[10], 6, 11, 50, "agendado",   false, undefined, sala2, aluguelCa));
  A.push(appt(ca, p[8],  8, 10, 50, "agendado",   false, undefined, sala2, aluguelCa));

  // ── Lucas — Sala 3 (Fisioterapeuta, 40min) ─────────────────────────────────
  // Carlos (valor especial R$100) – 2x/semana (seg e qua)
  for (let w = 7; w >= 1; w--) {
    A.push(appt(lu, p[3], -(w * 5),     9,  40, "realizado", true, 100, sala3, aluguelLu));
    A.push(appt(lu, p[3], -(w * 5) + 2, 9,  40, "realizado", true, 100, sala3, aluguelLu));
  }
  // Juliana – semanal, ter
  [-19 + 1, -14 + 1, -9 + 1, -4 + 1].forEach((bd) =>
    A.push(appt(lu, p[6], bd, 14, 40, "realizado", true, 120, sala3, aluguelLu)),
  );
  // Marcos – qua, faltou uma vez
  [-25 + 2, -20 + 2, -15 + 2, -10 + 2, -5 + 2].forEach((bd, i) =>
    A.push(appt(lu, p[9], bd, 15, 40, i === 2 ? "faltou" : "realizado", i !== 2, 120, sala3, aluguelLu)),
  );
  // Thiago – sex
  [-9 + 4, -4 + 4].forEach((bd) =>
    A.push(appt(lu, p[11], bd, 11, 40, "realizado", true, 120, sala3, aluguelLu)),
  );

  // Lucas – Futuros
  A.push(appt(lu, p[3],  1, 9,  40, "confirmado", false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[6],  1, 14, 40, "agendado",   false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[9],  2, 15, 40, "agendado",   false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[3],  3, 9,  40, "agendado",   false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[11], 4, 11, 40, "agendado",   false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[3],  6, 9,  40, "agendado",   false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[6],  6, 14, 40, "agendado",   false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[9],  7, 15, 40, "agendado",   false, undefined, sala3, aluguelLu));
  A.push(appt(lu, p[3],  8, 9,  40, "agendado",   false, undefined, sala3, aluguelLu));

  let agInserted = 0;
  for (let i = 0; i < A.length; i += 25) {
    const { data: batch, error: bErr } = await admin
      .from("agendamentos")
      .insert(A.slice(i, i + 25))
      .select("id");
    if (bErr) console.error("[seed] agendamentos batch:", bErr.message);
    else agInserted += batch?.length ?? 0;
  }
  stats.agendamentos = agInserted;

  // ── 5. Tarefas ────────────────────────────────────────────────────────────
  const tarefasData = [
    {
      titulo: "Ligar para João Pedro — reagendar consulta",
      descricao: "Paciente faltou na última sessão de nutrição. Confirmar disponibilidade.",
      prioridade: "alta",
      concluida: false,
      data_vencimento: dateStr(2),
      criado_por: profile.id,
      atribuido_para: profile.id,
    },
    {
      titulo: "Preparar material de grupo terapêutico",
      descricao: "Imprimir fichas de acompanhamento para quinta-feira.",
      prioridade: "normal",
      concluida: false,
      data_vencimento: dateStr(4),
      criado_por: profile.id,
      atribuido_para: profile.id,
    },
    {
      titulo: "Renovar seguro de responsabilidade civil",
      prioridade: "alta",
      concluida: false,
      data_vencimento: dateStr(25),
      criado_por: profile.id,
      atribuido_para: profile.id,
    },
    {
      titulo: "Atualizar prontuários digitais dos pacientes",
      descricao: "Revisar registros e atualizar evolução clínica.",
      prioridade: "normal",
      concluida: true,
      concluida_em: businessDay(-3).toISOString(),
      criado_por: profile.id,
      atribuido_para: profile.id,
    },
    {
      titulo: "Comprar material de escritório",
      descricao: "Canetas, papel A4, post-its e cartuchos de tinta.",
      prioridade: "baixa",
      concluida: false,
      data_vencimento: dateStr(10),
      criado_por: profile.id,
      atribuido_para: profile.id,
    },
    {
      titulo: "Reunião com equipe multidisciplinar",
      descricao: "Discutir casos complexos e alinhamento de abordagens.",
      prioridade: "alta",
      concluida: false,
      data_vencimento: dateStr(1),
      criado_por: profile.id,
      atribuido_para: profile.id,
    },
  ];

  const { data: tIns } = await admin.from("tarefas").insert(tarefasData).select("id");
  stats.tarefas = tIns?.length ?? 0;

  // ── 6. Post-its ───────────────────────────────────────────────────────────
  const postitsData = [
    { conteudo: "Reunião de equipe — quinta 15h\nSala de conferências", cor: "yellow", criado_por: profile.id },
    { conteudo: "Encaminhar Maria para avaliação psiquiátrica\nDr. Henrique — (11) 3456-7890", cor: "blue", criado_por: profile.id },
    { conteudo: "Férias Rafael\n20/07 → 03/08\nRedirecionar pacientes para Camila", cor: "pink", criado_por: profile.id },
    { conteudo: "Renovar alvará sanitário\nVence dia 30/06 — urgente!", cor: "red", criado_por: profile.id },
  ];

  const { data: pIns } = await admin.from("postits").insert(postitsData).select("id");
  stats.postits = pIns?.length ?? 0;

  // ── 7. Planner ────────────────────────────────────────────────────────────
  const { data: plannerRow } = await admin
    .from("planners")
    .insert({ nome: "Planejamento Clínico 2026", owner_profile_id: profile.id, ordem: 0 })
    .select("id")
    .single();

  if (plannerRow) {
    await admin.from("planner_tarefas").insert([
      { planner_id: plannerRow.id, titulo: "Revisão dos protocolos de atendimento", descricao: "Atualizar conforme resolução CFP 2024", data_tarefa: dateStr(15), concluida: false },
      { planner_id: plannerRow.id, titulo: "Treinamento LGPD para toda a equipe", descricao: "Realizar até o final do mês", data_tarefa: dateStr(20), concluida: false },
      { planner_id: plannerRow.id, titulo: "Implementar sistema de prontuário eletrônico", concluida: true, concluida_em: businessDay(-5).toISOString() },
      { planner_id: plannerRow.id, titulo: "Criar formulário de anamnese digital", data_tarefa: dateStr(7), concluida: false },
      { planner_id: plannerRow.id, titulo: "Reunião com contador — revisão fiscal do trimestre", data_tarefa: dateStr(10), concluida: false },
    ]);
    stats.planners = 1;
  }

  revalidatePath("/", "layout");

  const statStr = [
    `${stats.profissionais} profissionais`,
    `${stats.pacientes} pacientes`,
    stats.vinculos != null ? `${stats.vinculos} vínculos` : "",
    stats.salas ? `${stats.salas} salas criadas` : "",
    `${stats.agendamentos} agendamentos`,
    `${stats.tarefas} tarefas`,
    `${stats.postits} post-its`,
    stats.planners ? "1 planner" : "",
  ]
    .filter(Boolean)
    .join(", ");

  return { message: `Banco populado com sucesso: ${statStr}.`, stats };
}
