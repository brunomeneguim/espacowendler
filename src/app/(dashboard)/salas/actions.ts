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
  const { error } = await supabase.from("salas").update({ ativo: !data.ativo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/salas");
  revalidatePath("/agenda");
  return { error: null };
}
