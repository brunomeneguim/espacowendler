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

export async function reordenarSalas(ids: number[]): Promise<{ error: string | null }> {
  const supabase = createClient();
  const updates = ids.map((id, index) =>
    supabase.from("salas").update({ ordem: index }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const err = results.find(r => r.error);
  if (err?.error) return { error: err.error.message };
  revalidatePath("/salas");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function excluirSala(id: number): Promise<{ error: string | null; count?: number }> {
  const supabase = createClient();

  // Contar agendamentos vinculados (qualquer status, passado ou futuro)
  const { count, error: countErr } = await supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("sala_id", id);

  if (countErr) return { error: countErr.message };

  if ((count ?? 0) > 0) {
    // Retornar contagem para a UI perguntar ao usuário
    return { error: null, count: count! };
  }

  const { error } = await supabase.from("salas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/salas");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  return { error: null, count: 0 };
}

export async function excluirSalaComAgendamentos(id: number): Promise<{ error: string | null }> {
  const supabase = createClient();

  // Excluir todos os agendamentos da sala
  const { error: agErr } = await supabase.from("agendamentos").delete().eq("sala_id", id);
  if (agErr) return { error: agErr.message };

  // Excluir a sala
  const { error } = await supabase.from("salas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/salas");
  revalidatePath("/dashboard");
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
