import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { TarefasClient } from "./TarefasClient";

export default async function TarefasPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  // ── Filtro de tarefas por usuário ────────────────────────────────
  const isAdmin = ["admin", "supervisor"].includes(profile?.role ?? "");

  const [{ data: tarefasRaw }, { data: postits }, { data: profiles }] = await Promise.all([
    (() => {
      let q = supabase
        .from("tarefas")
        .select("id, titulo, descricao, concluida, prioridade, data_vencimento, criado_em, concluida_em, criado_por, atribuido_para, repeticao, criador:profiles!tarefas_criado_por_fkey(nome_completo), responsavel:profiles!tarefas_atribuido_para_fkey(nome_completo)")
        .order("criado_em", { ascending: false });
      if (!isAdmin) q = q.or(`criado_por.eq.${profile.id},atribuido_para.eq.${profile.id}`);
      return q;
    })(),
    supabase
      .from("postits")
      .select("id, conteudo, cor, criado_em, criado_por, criador:profiles!postits_criado_por_fkey(nome_completo)")
      .order("criado_em", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, nome_completo, role")
      .eq("ativo", true)
      .order("nome_completo"),
  ]);

  // Reset automático de tarefas recorrentes
  const agora = new Date();
  const idsParaResetar: string[] = (tarefasRaw ?? [])
    .filter((t: any) => {
      if (!t.concluida || !t.repeticao || t.repeticao === "nenhuma" || !t.concluida_em) return false;
      const concluidaEm = new Date(t.concluida_em);
      const criadoEm = new Date(t.criado_em);
      if (t.repeticao === "diaria") return agora.toDateString() !== concluidaEm.toDateString();
      if (t.repeticao === "semanal") {
        const diasDesdeConclucao = Math.floor((agora.getTime() - concluidaEm.getTime()) / 86400000);
        return diasDesdeConclucao >= 7 && agora.getDay() === criadoEm.getDay();
      }
      if (t.repeticao === "mensal") {
        const mesAtualMaior =
          agora.getFullYear() > concluidaEm.getFullYear() ||
          (agora.getFullYear() === concluidaEm.getFullYear() && agora.getMonth() > concluidaEm.getMonth());
        return mesAtualMaior && agora.getDate() >= criadoEm.getDate();
      }
      return false;
    })
    .map((t: any) => t.id);

  if (idsParaResetar.length > 0) {
    await supabase.from("tarefas")
      .update({ concluida: false, concluida_em: null })
      .in("id", idsParaResetar);
  }

  const { data: tarefas } = idsParaResetar.length > 0
    ? await (() => {
        let q = supabase
          .from("tarefas")
          .select("id, titulo, descricao, concluida, prioridade, data_vencimento, criado_em, concluida_em, criado_por, atribuido_para, repeticao, criador:profiles!tarefas_criado_por_fkey(nome_completo), responsavel:profiles!tarefas_atribuido_para_fkey(nome_completo)")
          .order("criado_em", { ascending: false });
        if (!isAdmin) q = q.or(`criado_por.eq.${profile.id},atribuido_para.eq.${profile.id}`);
        return q;
      })()
    : { data: tarefasRaw };

  // ── Aniversários — criar lembretes automáticos ─────────────────
  const anoAtual = agora.getFullYear();
  const isSecretaria = profile.role === "secretaria";
  const isProfOrSup = ["profissional", "supervisor"].includes(profile.role);

  // Buscar pacientes ativos com data_nascimento
  let pacientesQuery = supabase
    .from("pacientes")
    .select("id, nome_completo, data_nascimento")
    .eq("ativo", true)
    .not("data_nascimento", "is", null);

  // Profissional e supervisor: filtrar apenas seus pacientes vinculados
  let pacientesIds: string[] | null = null;
  if (isProfOrSup) {
    // Buscar profissional do profile atual
    const { data: profReg } = await supabase
      .from("profissionais")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (profReg?.id) {
      const { data: vinculos } = await supabase
        .from("paciente_profissional")
        .select("paciente_id")
        .eq("profissional_id", profReg.id);
      pacientesIds = (vinculos ?? []).map((v: any) => v.paciente_id);
    } else {
      pacientesIds = [];
    }
  }

  const { data: pacientesAniv } = pacientesIds !== null && pacientesIds.length === 0
    ? { data: [] }
    : pacientesIds !== null
      ? await supabase.from("pacientes").select("id, nome_completo, data_nascimento").eq("ativo", true).not("data_nascimento", "is", null).in("id", pacientesIds)
      : await supabase.from("pacientes").select("id, nome_completo, data_nascimento").eq("ativo", true).not("data_nascimento", "is", null);

  // Para cada paciente, verificar se o aniversário está nos próximos 7 dias
  const hoje = agora;
  const em7Dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

  const pacientesComAniv: { id: string; nome_completo: string; data_nascimento: string; diasRestantes: number }[] = [];
  for (const pac of (pacientesAniv ?? []) as any[]) {
    const nasc = new Date(pac.data_nascimento + "T12:00:00");
    // Aniversário deste ano
    const anivEsteAno = new Date(anoAtual, nasc.getMonth(), nasc.getDate(), 12, 0, 0);
    const anivProxAno = new Date(anoAtual + 1, nasc.getMonth(), nasc.getDate(), 12, 0, 0);

    let anivProximo = anivEsteAno;
    if (anivEsteAno < hoje) anivProximo = anivProxAno;

    const diff = Math.ceil((anivProximo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) {
      pacientesComAniv.push({ ...pac, diasRestantes: diff });
    }
  }

  // Auto-criar lembretes para pacientes com aniversário nos próximos 7 dias
  for (const pac of pacientesComAniv) {
    await supabase.from("lembretes_aniversario").upsert(
      { paciente_id: pac.id, ano: anoAtual },
      { onConflict: "paciente_id,ano", ignoreDuplicates: true }
    );
  }

  // Buscar todos os lembretes de aniversário (filtrando os relevantes)
  const anoRef = agora.getMonth() === 11 ? anoAtual + 1 : anoAtual; // se dezembro, incluir próximo ano
  const { data: lembretesRaw } = await supabase
    .from("lembretes_aniversario")
    .select("id, paciente_id, ano, concluida, concluida_em, paciente:pacientes(id, nome_completo, data_nascimento)")
    .in("ano", [anoAtual, anoRef])
    .order("ano");

  // Enriquecer lembretes com diasRestantes
  const lembretes = (lembretesRaw ?? []).map((l: any) => {
    const nasc = new Date((l.paciente?.data_nascimento ?? "") + "T12:00:00");
    const aniv = new Date(l.ano, nasc.getMonth(), nasc.getDate(), 12, 0, 0);
    const diff = Math.ceil((aniv.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return { ...l, diasRestantes: diff };
  }).filter((l: any) => {
    // Filtrar por vinculo se for profissional/supervisor
    if (pacientesIds !== null && !pacientesIds.includes(l.paciente_id)) return false;
    return true;
  });

  return (
    <TarefasClient
      tarefas={(tarefas ?? []) as any}
      postits={(postits ?? []) as any}
      profiles={profiles ?? []}
      currentUserId={profile.id}
      currentRole={profile.role}
      lembretes={(lembretes as any) ?? []}
    />
  );
}
