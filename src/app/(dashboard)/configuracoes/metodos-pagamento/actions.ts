"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function criarMetodo(
  valor: string,
  label: string
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return { error: "Apenas administradores podem gerenciar métodos de pagamento." };

  const v = valor.trim().toLowerCase().replace(/\s+/g, "_");
  const l = label.trim();
  if (!v || !l) return { error: "Valor e label são obrigatórios." };

  const supabase = createClient();

  // Buscar a maior ordem atual
  const { data: last } = await supabase
    .from("metodos_pagamento")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("metodos_pagamento").insert({
    valor: v,
    label: l,
    ordem: (last?.ordem ?? -1) + 1,
    ativo: true,
  });

  if (error) {
    if (error.code === "23505") return { error: "Já existe um método com esse valor/código." };
    return { error: error.message };
  }

  revalidatePath("/configuracoes/metodos-pagamento");
  return { error: null };
}

export async function atualizarMetodo(
  id: number,
  label: string,
  ativo: boolean
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return { error: "Apenas administradores podem gerenciar métodos de pagamento." };

  const supabase = createClient();
  const { error } = await supabase
    .from("metodos_pagamento")
    .update({ label: label.trim(), ativo })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/metodos-pagamento");
  return { error: null };
}

export async function excluirMetodo(
  id: number
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return { error: "Apenas administradores podem excluir métodos de pagamento." };

  const supabase = createClient();
  const { error } = await supabase.from("metodos_pagamento").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracoes/metodos-pagamento");
  return { error: null };
}

export async function reordenarMetodos(
  ids: number[]
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") return { error: "Apenas administradores podem reordenar métodos." };

  const supabase = createClient();
  for (let i = 0; i < ids.length; i++) {
    await supabase.from("metodos_pagamento").update({ ordem: i }).eq("id", ids[i]);
  }
  revalidatePath("/configuracoes/metodos-pagamento");
  return { error: null };
}
