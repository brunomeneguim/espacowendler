"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adicionarEncaixeDireto(
  paciente_nome: string,
  profissional_id: string | null,
  telefone?: string | null
): Promise<{ error: string | null; id: string | null; jaExistia?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nome = paciente_nome.trim();
  if (!nome) return { error: "Nome do paciente é obrigatório.", id: null };

  // ── Verificar duplicata: mesmo nome (case-insensitive) + mesmo profissional ──
  let dupeQuery = supabase
    .from("lista_encaixe")
    .select("id")
    .eq("ativo", true)
    .ilike("paciente_nome", nome);
  if (profissional_id) {
    dupeQuery = dupeQuery.eq("profissional_id", profissional_id);
  } else {
    dupeQuery = dupeQuery.is("profissional_id", null);
  }
  const { data: existente } = await dupeQuery.maybeSingle();
  if (existente?.id) {
    // Já está na lista — retorna o id existente sem inserir novamente
    return { error: null, id: existente.id, jaExistia: true };
  }

  const { data, error } = await supabase.from("lista_encaixe").insert({
    paciente_nome: nome,
    profissional_id: profissional_id || null,
    telefone: telefone || null,
    created_by: user?.id,
    ativo: true,
  }).select("id").single();
  if (error) return { error: error.message, id: null };
  revalidatePath("/dashboard");
  return { error: null, id: data?.id ?? null };
}

export async function adicionarEncaixe(formData: FormData): Promise<{ error: string | null; id: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const paciente_nome   = (formData.get("paciente_nome") as string)?.trim();
  const telefone        = (formData.get("telefone") as string) || null;
  const observacoes     = (formData.get("observacoes") as string) || null;
  const profissional_id = (formData.get("profissional_id") as string) || null;

  if (!paciente_nome) return { error: "Nome do paciente é obrigatório.", id: null };

  const { data, error } = await supabase.from("lista_encaixe").insert({
    paciente_nome,
    telefone,
    observacoes,
    profissional_id,
    created_by: user?.id,
    ativo: true,
  }).select("id").single();

  if (error) return { error: error.message, id: null };
  revalidatePath("/dashboard");
  return { error: null, id: data?.id ?? null };
}

export async function removerEncaixe(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("lista_encaixe").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function editarEncaixe(
  id: string,
  dados: { paciente_nome: string; telefone: string | null; observacoes: string | null; profissional_id: string | null }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("lista_encaixe").update(dados).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
