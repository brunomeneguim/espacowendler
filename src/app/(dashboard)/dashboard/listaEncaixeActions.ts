"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adicionarEncaixeDireto(
  paciente_nome: string,
  profissional_id: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!paciente_nome.trim()) return { error: "Nome do paciente é obrigatório." };
  const { error } = await supabase.from("lista_encaixe").insert({
    paciente_nome: paciente_nome.trim(),
    profissional_id: profissional_id || null,
    created_by: user?.id,
    ativo: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function adicionarEncaixe(formData: FormData): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const paciente_nome   = (formData.get("paciente_nome") as string)?.trim();
  const telefone        = (formData.get("telefone") as string) || null;
  const observacoes     = (formData.get("observacoes") as string) || null;
  const profissional_id = (formData.get("profissional_id") as string) || null;

  if (!paciente_nome) return { error: "Nome do paciente é obrigatório." };

  const { error } = await supabase.from("lista_encaixe").insert({
    paciente_nome,
    telefone,
    observacoes,
    profissional_id,
    created_by: user?.id,
    ativo: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
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
