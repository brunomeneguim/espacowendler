"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types/database";

export async function atualizarRole(
  profileId: string,
  novoRole: UserRole
): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Apenas administradores podem alterar permissões." };
  if (profileId === current.id) return { error: "Você não pode alterar sua própria permissão." };

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: novoRole })
    .eq("id", profileId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/acesso");
  return { error: null };
}
