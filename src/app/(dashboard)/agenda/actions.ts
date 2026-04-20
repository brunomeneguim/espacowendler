"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function criarAgendamento(formData: FormData) {
  const supabase = createClient();

  const profissional_id = formData.get("profissional_id") as string;
  const paciente_id = formData.get("paciente_id") as string;
  const sala_id = formData.get("sala_id") as string;
  const data = formData.get("data") as string; // YYYY-MM-DD
  const hora = formData.get("hora") as string; // HH:mm
  const duracao = parseInt((formData.get("duracao") as string) || "50", 10);
  const observacoes = (formData.get("observacoes") as string) || null;

  const inicio = new Date(`${data}T${hora}:00`);
  const fim = new Date(inicio.getTime() + duracao * 60_000);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("agendamentos").insert({
    profissional_id,
    paciente_id,
    sala_id: sala_id ? parseInt(sala_id) : null,
    data_hora_inicio: inicio.toISOString(),
    data_hora_fim: fim.toISOString(),
    status: "agendado",
    observacoes,
    created_by: user?.id,
  });

  if (error) {
    return redirect(
      `/agenda/novo?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}

export async function atualizarStatusAgendamento(
  id: string,
  status: "confirmado" | "realizado" | "cancelado" | "faltou"
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("agendamentos")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function editarAgendamento(id: string, formData: FormData) {
  const supabase = createClient();

  const profissional_id = formData.get("profissional_id") as string;
  const paciente_id = formData.get("paciente_id") as string;
  const sala_id = formData.get("sala_id") as string;
  const data = formData.get("data") as string;
  const hora = formData.get("hora") as string;
  const duracao = parseInt((formData.get("duracao") as string) || "50", 10);
  const status = formData.get("status") as string;
  const observacoes = (formData.get("observacoes") as string) || null;

  const inicio = new Date(`${data}T${hora}:00`);
  const fim = new Date(inicio.getTime() + duracao * 60_000);

  const { error } = await supabase
    .from("agendamentos")
    .update({
      profissional_id,
      paciente_id,
      sala_id: sala_id ? parseInt(sala_id) : null,
      data_hora_inicio: inicio.toISOString(),
      data_hora_fim: fim.toISOString(),
      status,
      observacoes,
    })
    .eq("id", id);

  if (error) {
    return redirect(
      `/agenda/${id}/editar?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}

export async function excluirAgendamento(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  redirect("/agenda");
}
