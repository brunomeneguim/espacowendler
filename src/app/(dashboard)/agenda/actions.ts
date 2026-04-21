"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── Verificar conflito de profissional ────────────────────────────
async function verificarConflito(
  supabase: ReturnType<typeof createClient>,
  profissional_id: string,
  inicio: Date,
  fim: Date,
  excluir_id?: string
): Promise<string | null> {
  let query = supabase
    .from("agendamentos")
    .select("id, data_hora_inicio, data_hora_fim, sala:salas(nome)")
    .eq("profissional_id", profissional_id)
    .not("status", "in", '("cancelado","faltou")')
    .lt("data_hora_inicio", fim.toISOString())
    .gt("data_hora_fim", inicio.toISOString());

  if (excluir_id) query = query.neq("id", excluir_id);

  const { data } = await query.limit(1);
  if (data && data.length > 0) {
    const conflito = data[0] as any;
    const h = new Date(conflito.data_hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `Profissional já possui agendamento às ${h}. Escolha outro horário ou profissional.`;
  }
  return null;
}

// ── Gerar datas recorrentes ───────────────────────────────────────
function gerarDatas(inicio: Date, recorrencia: string, meses: number): Date[] {
  const datas: Date[] = [];
  const total = recorrencia === "semanal" ? meses * 4 : recorrencia === "quinzenal" ? meses * 2 : meses;

  for (let i = 1; i <= total; i++) {
    const nova = new Date(inicio);
    if (recorrencia === "semanal")   nova.setDate(inicio.getDate() + i * 7);
    if (recorrencia === "quinzenal") nova.setDate(inicio.getDate() + i * 14);
    if (recorrencia === "mensal")    nova.setMonth(inicio.getMonth() + i);
    datas.push(nova);
  }
  return datas;
}

// ── Criar agendamento ─────────────────────────────────────────────
export async function criarAgendamento(formData: FormData): Promise<{ error: string | null } | void> {
  const supabase = createClient();

  const profissional_id = formData.get("profissional_id") as string;
  const paciente_id     = formData.get("paciente_id") as string;
  const sala_id         = formData.get("sala_id") as string;
  const data            = formData.get("data") as string;
  const hora            = formData.get("hora") as string;
  const duracao         = parseInt((formData.get("duracao") as string) || "60", 10);
  const observacoes     = (formData.get("observacoes") as string) || null;
  const recorrencia     = (formData.get("recorrencia") as string) || "nenhuma";
  const meses           = parseInt((formData.get("meses_recorrencia") as string) || "3", 10);

  const { data: { user } } = await supabase.auth.getUser();

  const inicio = new Date(`${data}T${hora}:00`);
  const fim    = new Date(inicio.getTime() + duracao * 60_000);

  // Verificar conflito do agendamento principal
  const conflito = await verificarConflito(supabase, profissional_id, inicio, fim);
  if (conflito) return redirect(`/agenda/novo?error=${encodeURIComponent(conflito)}`);

  const salaIdNum = sala_id ? parseInt(sala_id) : null;
  const base = {
    profissional_id,
    paciente_id,
    sala_id: salaIdNum,
    status: "agendado",
    observacoes,
    created_by: user?.id,
  };

  // Inserir agendamento principal
  const { error } = await supabase.from("agendamentos").insert({
    ...base,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim:    fim.toISOString(),
  });
  if (error) return redirect(`/agenda/novo?error=${encodeURIComponent(error.message)}`);

  // Inserir recorrências
  if (recorrencia !== "nenhuma") {
    const datas = gerarDatas(inicio, recorrencia, meses);
    for (const d of datas) {
      const fimRec = new Date(d.getTime() + duracao * 60_000);
      // Pular se houver conflito na data recorrente
      const c = await verificarConflito(supabase, profissional_id, d, fimRec);
      if (c) continue; // pula sem cancelar o resto
      await supabase.from("agendamentos").insert({
        ...base,
        data_hora_inicio: d.toISOString(),
        data_hora_fim:    fimRec.toISOString(),
      });
    }
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}

export async function atualizarStatusAgendamento(
  id: string,
  status: "agendado" | "confirmado" | "realizado" | "cancelado" | "faltou"
) {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function editarAgendamento(id: string, formData: FormData) {
  const supabase = createClient();

  const profissional_id = formData.get("profissional_id") as string;
  const paciente_id     = formData.get("paciente_id") as string;
  const sala_id         = formData.get("sala_id") as string;
  const data            = formData.get("data") as string;
  const hora            = formData.get("hora") as string;
  const duracao         = parseInt((formData.get("duracao") as string) || "60", 10);
  const status          = formData.get("status") as string;
  const observacoes     = (formData.get("observacoes") as string) || null;

  const inicio = new Date(`${data}T${hora}:00`);
  const fim    = new Date(inicio.getTime() + duracao * 60_000);

  const { error } = await supabase.from("agendamentos").update({
    profissional_id,
    paciente_id,
    sala_id: sala_id ? parseInt(sala_id) : null,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim:    fim.toISOString(),
    status,
    observacoes,
  }).eq("id", id);

  if (error) return redirect(`/agenda/${id}/editar?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}

export async function atualizarAgendamento(
  id: string,
  profissional_id: string,
  paciente_id: string,
  sala_id: string | null,
  data: string,
  hora: string,
  duracao: number,
  status: string,
  observacoes: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const inicio = new Date(`${data}T${hora}:00`);
  const fim    = new Date(inicio.getTime() + duracao * 60_000);

  // Verificar conflito (excluindo o próprio agendamento)
  const conflito = await verificarConflito(supabase, profissional_id, inicio, fim, id);
  if (conflito) return { error: conflito };

  const { error } = await supabase.from("agendamentos").update({
    profissional_id,
    paciente_id,
    sala_id: sala_id ? parseInt(sala_id) : null,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim:    fim.toISOString(),
    status,
    observacoes: observacoes || null,
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
