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

export async function criarUsuario(formData: FormData): Promise<{ error: string | null }> {
  const supabase = createClient();
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Sem permissão." };

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nome_completo = formData.get("nome_completo") as string;
  const telefone = (formData.get("telefone") as string) || null;
  const role = (formData.get("role") as string) || "secretaria";

  // Create auth user using service role (admin API)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome_completo, telefone },
  });
  if (error) return { error: error.message };

  // Update the profile role (trigger creates it with default role)
  if (data.user) {
    await adminClient.from("profiles").update({ role, nome_completo, telefone }).eq("id", data.user.id);
  }

  revalidatePath("/equipe");
  return { error: null };
}

export async function editarUsuarioCompleto(id: string, formData: FormData): Promise<{ error: string | null }> {
  const supabase = createClient();
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Sem permissão." };

  const nome_completo = formData.get("nome_completo") as string;
  const email = formData.get("email") as string;
  const telefone = (formData.get("telefone") as string) || null;
  const role = formData.get("role") as string;
  const ativo = formData.get("ativo") === "true";

  // Update profile table
  const { error: profileError } = await supabase.from("profiles")
    .update({ nome_completo, email, telefone, role, ativo })
    .eq("id", id);
  if (profileError) return { error: profileError.message };

  // Update auth email if changed
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(id, { email });
  if (authError) return { error: authError.message };

  revalidatePath("/equipe");
  return { error: null };
}
