"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Planners ────────────────────────────────────────────────────────

export async function criarPlanner(nome: string): Promise<{ error: string | null; id?: string }> {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("planners")
    .insert({ nome: nome || "Planner", owner_profile_id: profile.id, criado_por: profile.id })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null, id: data.id };
}

export async function renomearPlanner(id: string, nome: string): Promise<{ error: string | null }> {
  if (!nome.trim()) return { error: "Nome não pode ser vazio." };
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: planner } = await supabase
    .from("planners").select("owner_profile_id").eq("id", id).single();
  if (planner?.owner_profile_id !== profile.id)
    return { error: "Sem permissão para renomear este planner." };

  const { error } = await supabase.from("planners").update({ nome: nome.trim() }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null };
}

export async function excluirPlanner(id: string): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: planner } = await supabase
    .from("planners").select("owner_profile_id").eq("id", id).single();
  if (planner?.owner_profile_id !== profile.id)
    return { error: "Sem permissão para excluir este planner." };

  const { error } = await supabase.from("planners").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null };
}

// ── Compartilhamentos ────────────────────────────────────────────────

export async function buscarCompartilhamentos(
  plannerId: string,
): Promise<{ data: string[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("planner_compartilhamentos")
    .select("shared_with_profile_id")
    .eq("planner_id", plannerId);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map((r) => r.shared_with_profile_id), error: null };
}

export async function salvarCompartilhamentos(
  plannerId: string,
  profileIds: string[],
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data: planner } = await supabase
    .from("planners").select("owner_profile_id").eq("id", plannerId).single();
  if (planner?.owner_profile_id !== profile.id)
    return { error: "Sem permissão." };

  // Deleta tudo e recria
  await supabase.from("planner_compartilhamentos").delete().eq("planner_id", plannerId);

  if (profileIds.length > 0) {
    const { error } = await supabase.from("planner_compartilhamentos").insert(
      profileIds.map((pid) => ({
        planner_id: plannerId,
        shared_with_profile_id: pid,
        criado_por: profile.id,
      })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/planner");
  return { error: null };
}

export async function removerCompartilhamento(
  plannerId: string,
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { error } = await supabase
    .from("planner_compartilhamentos")
    .delete()
    .eq("planner_id", plannerId)
    .eq("shared_with_profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null };
}

// ── Tarefas ─────────────────────────────────────────────────────────

export async function criarTarefaPlanner(
  plannerId: string,
  titulo: string,
  dataTarefa: string,
  descricao?: string,
): Promise<{ error: string | null; tarefa?: Record<string, unknown> }> {
  if (!titulo.trim()) return { error: "Título não pode ser vazio." };
  const profile = await getCurrentProfile();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("planner_tarefas")
    .insert({
      planner_id: plannerId,
      titulo: titulo.trim(),
      data_tarefa: dataTarefa,
      descricao: descricao?.trim() || null,
      criado_por: profile.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null, tarefa: data };
}

export async function editarTarefaPlanner(
  id: string,
  titulo: string,
  descricao?: string,
): Promise<{ error: string | null }> {
  if (!titulo.trim()) return { error: "Título não pode ser vazio." };
  const supabase = createClient();
  const { error } = await supabase
    .from("planner_tarefas")
    .update({ titulo: titulo.trim(), descricao: descricao?.trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null };
}

export async function alternarTarefaPlanner(id: string, concluida: boolean): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("planner_tarefas").update({
    concluida,
    concluida_em: concluida ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null };
}

export async function excluirTarefaPlanner(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("planner_tarefas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/planner");
  return { error: null };
}
