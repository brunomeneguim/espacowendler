"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";

export async function excluirMembro(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const current = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(current.role)) return { error: "Sem permissão." };
  if (id === current.id) return { error: "Você não pode excluir sua própria conta." };

  // Remove agendamentos vinculados (como profissional ou criador)
  await supabase.from("agendamentos").delete().eq("profissional_id",
    (await supabase.from("profissionais").select("id").eq("profile_id", id).maybeSingle()).data?.id ?? ""
  );
  // Remove registro de profissional se existir
  await supabase.from("profissionais").delete().eq("profile_id", id);
  // Remove o profile
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/equipe");
  return { error: null };
}

export async function editarPerfil(id: string, formData: FormData) {
  const supabase = createClient();

  const role = formData.get("role") as string;
  const ativo = formData.get("ativo") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({ role, ativo })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/equipe");
}
