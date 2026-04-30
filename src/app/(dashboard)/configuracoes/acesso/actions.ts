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

export async function salvarTodasPermissoes(
  profileId: string,
  permissoes: Array<{ pagina: string; podeVer: boolean; podeEditar: boolean }>
): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Apenas administradores podem alterar permissões." };

  const supabase = createClient();
  const { error } = await supabase
    .from("permissoes_usuario")
    .upsert(
      permissoes.map(p => ({
        profile_id: profileId,
        pagina: p.pagina,
        pode_ver: p.podeVer,
        pode_editar: p.podeEditar,
      })),
      { onConflict: "profile_id,pagina" }
    );

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/acesso");
  return { error: null };
}

export async function resetarPermissoes(
  profileId: string
): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Apenas administradores podem alterar permissões." };

  const supabase = createClient();
  const { error } = await supabase
    .from("permissoes_usuario")
    .delete()
    .eq("profile_id", profileId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/acesso");
  return { error: null };
}

export async function buscarPermissoes(
  profileId: string
): Promise<Record<string, { podeVer: boolean; podeEditar: boolean }>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("permissoes_usuario")
    .select("pagina, pode_ver, pode_editar")
    .eq("profile_id", profileId);

  if (!data) return {};
  return Object.fromEntries(
    data.map(p => [p.pagina, { podeVer: p.pode_ver, podeEditar: p.pode_editar }])
  );
}
