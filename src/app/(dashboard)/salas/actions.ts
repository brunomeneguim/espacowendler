"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarSala(nome: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("salas").insert({ nome, ativo: true });
  if (error) return { error: error.message };
  revalidatePath("/salas");
  return { error: null };
}

export async function atualizarSala(id: number, nome: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("salas").update({ nome }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/salas");
  return { error: null };
}

export async function toggleAtivoSala(id: number): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data } = await supabase.from("salas").select("ativo").eq("id", id).single();
  if (!data) return { error: "Sala não encontrada." };

  // Se está desativando, verificar se há agendamentos futuros
  if (data.ativo) {
    const agora = new Date().toISOString();
    const { count } = await supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("sala_id", id)
      .gte("data_hora_inicio", agora)
      .not("status", "in", "(cancelado,faltou)");

    if ((count ?? 0) > 0) {
      return { error: `Esta sala possui ${count} agendamento(s) futuro(s). Cancele-os antes de desativar a sala.` };
    }
  }

  const { error } = await supabase.from("salas").update({ ativo: !data.ativo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/salas");
  revalidatePath("/agenda");
  return { error: null };
}

export async function atualizarAluguelProfissional(
  profissionalId: string,
  valorAluguel: number
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profissionais")
    .update({ valor_aluguel_sala: valorAluguel })
    .eq("id", profissionalId);
  if (error) return { error: error.message };
  revalidatePath("/salas");
  return { error: null };
}
