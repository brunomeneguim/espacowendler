"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

// ── Verificar horário indisponível (exportado para uso nos forms) ──
export async function verificarHorarioIndisponivel(
  profissionalId: string,
  data: string,   // "YYYY-MM-DD"
  hora: string    // "HH:MM"
): Promise<{ conflito: boolean }> {
  if (!profissionalId || !data || !hora) return { conflito: false };
  const supabase = createClient();

  // Calcular dia da semana a partir da string de data (evita problemas de timezone)
  const [year, month, day] = data.split("-").map(Number);
  const diaSemana = new Date(year, month - 1, day).getDay(); // 0=Dom … 6=Sáb

  const { data: horarios } = await supabase
    .from("horarios_indisponiveis")
    .select("hora_inicio, hora_fim")
    .eq("profissional_id", profissionalId)
    .eq("dia_semana", diaSemana);

  if (!horarios || horarios.length === 0) return { conflito: false };

  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };
  const horaMin = toMin(hora);

  const conflito = horarios.some(h => {
    const ini = toMin(h.hora_inicio as string);
    const fim = toMin(h.hora_fim as string);
    return horaMin >= ini && horaMin < fim;
  });

  return { conflito };
}

// ── Verificar horário de atendimento do profissional ─────────────
// horaLocal = "HH:MM" no horário local do usuário (não UTC)
// duracaoMin = duração em minutos
async function verificarHorarioProfissional(
  supabase: ReturnType<typeof createClient>,
  profissional_id: string,
  horaLocal: string,
  duracaoMin: number
): Promise<string | null> {
  const { data: prof } = await supabase
    .from("profissionais")
    .select("horario_inicio, horario_fim")
    .eq("id", profissional_id)
    .single();

  if (!prof || !prof.horario_inicio || !prof.horario_fim) return null;

  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };

  const totalIni = toMin(horaLocal);
  const totalFim = totalIni + duracaoMin;
  const limiteIni = toMin(prof.horario_inicio as string);
  const limiteFim = toMin(prof.horario_fim as string);

  if (totalIni < limiteIni || totalFim > limiteFim) {
    return `Este profissional atende apenas das ${(prof.horario_inicio as string).slice(0, 5)} às ${(prof.horario_fim as string).slice(0, 5)}. Ajuste o horário do agendamento.`;
  }
  return null;
}

// ── Verificar conflito de profissional ────────────────────────────
async function verificarConflito(
  supabase: ReturnType<typeof createClient>,
  profissional_id: string,
  paciente_id: string | null,
  sala_id: number | null,
  inicio: Date,
  fim: Date,
  excluir_id?: string
): Promise<string | null> {
  let q = supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, profissional_id, paciente_id, sala_id")
    .not("status", "in", "(cancelado,faltou)")
    .lt("data_hora_inicio", fim.toISOString())
    .gt("data_hora_fim", inicio.toISOString());

  if (excluir_id) q = q.neq("id", excluir_id);

  const { data: conflitos } = await q;
  if (!conflitos || conflitos.length === 0) return null;

  for (const c of conflitos as any[]) {
    const h = new Date(c.data_hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

    // Mesmo profissional + mesmo paciente
    if (c.profissional_id === profissional_id && c.paciente_id === paciente_id) {
      return `Este profissional já tem uma consulta com este paciente às ${h}. Não é possível agendar dois atendimentos simultâneos.`;
    }
    // Mesmo profissional em qualquer sala
    if (c.profissional_id === profissional_id) {
      return `Este profissional já possui um agendamento às ${h}. Escolha outro horário ou profissional.`;
    }
    // Mesma sala com profissional diferente
    if (sala_id && c.sala_id === sala_id) {
      return `Esta sala já está ocupada às ${h}. Escolha outra sala ou outro horário.`;
    }
  }
  return null;
}

// ── Gerar datas recorrentes ───────────────────────────────────────
function gerarDatas(inicio: Date, recorrencia: string, meses: number, mensal_tipo: string): Date[] {
  const datas: Date[] = [];
  const total = recorrencia === "semanal" ? meses * 4 : recorrencia === "quinzenal" ? meses * 2 : meses;

  for (let i = 1; i <= total; i++) {
    const nova = new Date(inicio);
    if (recorrencia === "semanal")   nova.setDate(inicio.getDate() + i * 7);
    if (recorrencia === "quinzenal") nova.setDate(inicio.getDate() + i * 14);
    if (recorrencia === "mensal") {
      if (mensal_tipo === "dia_semana") {
        // Mesmo dia da semana, mesma semana do mês
        const diaSemana = inicio.getDay();
        const semana = Math.ceil(inicio.getDate() / 7);
        const target = new Date(inicio);
        target.setDate(1);
        target.setMonth(inicio.getMonth() + i);
        let count = 0;
        while (count < semana) {
          if (target.getDay() === diaSemana) count++;
          if (count < semana) target.setDate(target.getDate() + 1);
        }
        target.setHours(inicio.getHours(), inicio.getMinutes(), 0, 0);
        datas.push(target);
        continue;
      } else {
        // Mesmo dia do mês
        nova.setMonth(inicio.getMonth() + i);
      }
    }
    datas.push(nova);
  }
  return datas;
}

// ── Criar agendamento ─────────────────────────────────────────────
export async function criarAgendamento(formData: FormData): Promise<{ error: string | null; ignoradas: number; datasIgnoradas: string[] }> {
  const supabase = createClient();

  const profissional_id   = formData.get("profissional_id") as string;
  const tipo_agendamento  = (formData.get("tipo_agendamento") as string) || "consulta_avulsa";
  const isAusencia        = tipo_agendamento === "ausencia";
  const paciente_id       = isAusencia ? null : (formData.get("paciente_id") as string);
  const sala_id           = formData.get("sala_id") as string;
  const data              = formData.get("data") as string;
  const hora              = formData.get("hora") as string;
  const duracao           = parseInt((formData.get("duracao") as string) || "60", 10);
  const observacoes       = (formData.get("observacoes") as string) || null;
  const recorrencia       = isAusencia ? "nenhuma" : ((formData.get("recorrencia") as string) || "nenhuma");
  const meses             = parseInt((formData.get("meses_recorrencia") as string) || "3", 10);
  const mensal_tipo       = (formData.get("mensal_tipo") as string) || "dia_mes";

  const { data: { user } } = await supabase.auth.getUser();

  const tzOffset = parseInt((formData.get("tz_offset") as string) || "0");
  const inicio = new Date(`${data}T${hora}:00`);
  inicio.setMinutes(inicio.getMinutes() + tzOffset);
  const fim    = new Date(inicio.getTime() + duracao * 60_000);

  const salaIdNum = sala_id ? parseInt(sala_id) : null;

  if (!isAusencia) {
    // Verificar horário de atendimento do profissional
    const erroHorario = await verificarHorarioProfissional(supabase, profissional_id, hora, duracao);
    if (erroHorario) return { error: erroHorario, ignoradas: 0, datasIgnoradas: [] };
  }

  // Verificar conflito (ausência também bloqueia o profissional)
  const conflito = await verificarConflito(supabase, profissional_id, paciente_id, salaIdNum, inicio, fim);
  if (conflito) return { error: conflito, ignoradas: 0, datasIgnoradas: [] };

  const grupo_id = recorrencia !== "nenhuma" ? randomUUID() : null;

  const base = {
    profissional_id,
    paciente_id,
    sala_id: salaIdNum,
    status: isAusencia ? "ausencia" : "agendado",
    tipo_agendamento,
    observacoes,
    created_by: user?.id,
    recorrencia_grupo_id: grupo_id,
  };

  const { error } = await supabase.from("agendamentos").insert({
    ...base,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim:    fim.toISOString(),
  });
  if (error) return { error: error.message, ignoradas: 0, datasIgnoradas: [] };

  // Inserir recorrências (ausência não tem recorrência)
  let ignoradas = 0;
  const datasIgnoradas: string[] = [];
  if (recorrencia !== "nenhuma") {
    const datas = gerarDatas(inicio, recorrencia, meses, mensal_tipo);
    for (const d of datas) {
      const fimRec = new Date(d.getTime() + duracao * 60_000);
      const c = await verificarConflito(supabase, profissional_id, paciente_id, salaIdNum, d, fimRec);
      if (c) { ignoradas++; datasIgnoradas.push(d.toISOString()); continue; }
      await supabase.from("agendamentos").insert({
        ...base,
        data_hora_inicio: d.toISOString(),
        data_hora_fim:    fimRec.toISOString(),
      });
    }
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null, ignoradas, datasIgnoradas };
}

export async function atualizarStatusAgendamento(
  id: string,
  status: "agendado" | "confirmado" | "realizado" | "finalizado" | "cancelado" | "faltou" | "ausencia"
) {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function editarAgendamento(id: string, formData: FormData) {
  const supabase = createClient();

  const profissional_id  = formData.get("profissional_id") as string;
  const tipo_agendamento = (formData.get("tipo_agendamento") as string) || "consulta_avulsa";
  const isAusencia       = tipo_agendamento === "ausencia";
  const paciente_id      = isAusencia ? null : (formData.get("paciente_id") as string);
  const sala_id          = formData.get("sala_id") as string;
  const data             = formData.get("data") as string;
  const hora             = formData.get("hora") as string;
  const duracao          = parseInt((formData.get("duracao") as string) || "60", 10);
  const status           = isAusencia ? "ausencia" : (formData.get("status") as string);
  const observacoes      = (formData.get("observacoes") as string) || null;
  const editarGrupo      = formData.get("editar_grupo") === "true";
  const tzOffset         = parseInt((formData.get("tz_offset") as string) || "0");

  const inicio = new Date(`${data}T${hora}:00`);
  inicio.setMinutes(inicio.getMinutes() + tzOffset);
  const fim    = new Date(inicio.getTime() + duracao * 60_000);
  const salaIdNum = sala_id ? parseInt(sala_id) : null;

  if (!isAusencia) {
    const erroHorario = await verificarHorarioProfissional(supabase, profissional_id, hora, duracao);
    if (erroHorario) return redirect(`/agenda/${id}/editar?error=${encodeURIComponent(erroHorario)}`);
  }

  const conflito = await verificarConflito(supabase, profissional_id, paciente_id, salaIdNum, inicio, fim, id);
  if (conflito) return redirect(`/agenda/${id}/editar?error=${encodeURIComponent(conflito)}`);

  const updateData = {
    profissional_id,
    paciente_id,
    sala_id: salaIdNum,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim:    fim.toISOString(),
    status,
    tipo_agendamento,
    observacoes,
  };

  if (editarGrupo) {
    // Buscar grupo_id do agendamento atual
    const { data: ag } = await supabase.from("agendamentos").select("recorrencia_grupo_id, data_hora_inicio").eq("id", id).single();
    if (ag?.recorrencia_grupo_id) {
      // Atualizar apenas os agendamentos futuros do grupo (incluindo este)
      await supabase.from("agendamentos")
        .update({ profissional_id, paciente_id, sala_id: salaIdNum, status, observacoes })
        .eq("recorrencia_grupo_id", ag.recorrencia_grupo_id)
        .gte("data_hora_inicio", ag.data_hora_inicio);
    }
  }

  const { error } = await supabase.from("agendamentos").update(updateData).eq("id", id);

  if (error) return redirect(`/agenda/${id}/editar?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}

export async function atualizarAgendamento(
  id: string,
  profissional_id: string,
  paciente_id: string | null,
  sala_id: string | null,
  data: string,
  hora: string,
  duracao: number,
  status: string,
  observacoes: string | null,
  tzOffset: number = 0,
  tipo_agendamento?: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const inicio = new Date(`${data}T${hora}:00`);
  inicio.setMinutes(inicio.getMinutes() + tzOffset);
  const fim    = new Date(inicio.getTime() + duracao * 60_000);
  const salaIdNum = sala_id ? parseInt(sala_id) : null;

  // Skip patient conflict check for ausencia
  if (tipo_agendamento !== "ausencia" && paciente_id) {
    const conflito = await verificarConflito(supabase, profissional_id, paciente_id, salaIdNum, inicio, fim, id);
    if (conflito) return { error: conflito };
  }

  const { error } = await supabase.from("agendamentos").update({
    profissional_id,
    paciente_id: tipo_agendamento === "ausencia" ? null : paciente_id,
    sala_id: salaIdNum,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim:    fim.toISOString(),
    status: tipo_agendamento === "ausencia" ? "ausencia" : status,
    observacoes: observacoes || null,
    tipo_agendamento: tipo_agendamento || "consulta_avulsa",
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  return { error: null };
}

export async function excluirAgendamento(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}

export async function excluirGrupoAgendamento(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  // Buscar o grupo
  const { data: ag } = await supabase.from("agendamentos").select("recorrencia_grupo_id, data_hora_inicio").eq("id", id).single();
  if (ag?.recorrencia_grupo_id) {
    // Excluir este e todos os futuros do grupo
    await supabase.from("agendamentos")
      .delete()
      .eq("recorrencia_grupo_id", ag.recorrencia_grupo_id)
      .gte("data_hora_inicio", ag.data_hora_inicio);
  } else {
    // Sem grupo, excluir apenas este
    await supabase.from("agendamentos").delete().eq("id", id);
  }
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deletarAgendamentoClient(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deletarAgendamentosPaciente(pacienteId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("paciente_id", pacienteId);
  if (error) return { error: error.message };
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}
