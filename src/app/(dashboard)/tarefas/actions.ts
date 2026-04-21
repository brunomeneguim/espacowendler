"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Tarefas ──────────────────────────────────────────────────────
export async function criarTarefa(formData: FormData): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const titulo          = formData.get("titulo") as string;
  const descricao       = (formData.get("descricao") as string) || null;
  const prioridade      = (formData.get("prioridade") as string) || "normal";
  const data_vencimento = (formData.get("data_vencimento") as string) || null;
  const atribuido_para  = (formData.get("atribuido_para") as string) || null;
  const repeticao       = (formData.get("repeticao") as string) || "nenhuma";

  const { error } = await supabase.from("tarefas").insert({
    titulo, descricao, prioridade, data_vencimento, atribuido_para, repeticao,
    criado_por: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { error: null };
}

export async function atualizarTarefa(id: string, formData: FormData): Promise<{ error: string | null }> {
  const supabase = createClient();

  const titulo          = formData.get("titulo") as string;
  const descricao       = (formData.get("descricao") as string) || null;
  const prioridade      = (formData.get("prioridade") as string) || "normal";
  const data_vencimento = (formData.get("data_vencimento") as string) || null;
  const atribuido_para  = (formData.get("atribuido_para") as string) || null;
  const repeticao       = (formData.get("repeticao") as string) || "nenhuma";

  const { error } = await supabase.from("tarefas").update({
    titulo, descricao, prioridade, data_vencimento, atribuido_para, repeticao,
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { error: null };
}

export async function alternarTarefa(id: string, concluida: boolean): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("tarefas").update({
    concluida,
    concluida_em: concluida ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { error: null };
}

export async function excluirTarefa(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("tarefas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { error: null };
}

// ── Post-its ─────────────────────────────────────────────────────
export async function criarPostit(formData: FormData): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const conteudo = formData.get("conteudo") as string;
  const cor = (formData.get("cor") as string) || "yellow";

  const { error } = await supabase.from("postits").insert({
    conteudo,
    cor,
    criado_por: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { error: null };
}

export async function excluirPostit(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("postits").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tarefas");
  return { error: null };
}
