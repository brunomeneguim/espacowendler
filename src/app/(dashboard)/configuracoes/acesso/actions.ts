"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types/database";

// ── Permissões de role ──────────────────────────────────────────────────────

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

// ── Gestão de usuários ──────────────────────────────────────────────────────

export async function toggleAtivo(
  id: string,
  ativo: boolean
): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(current.role)) return { error: "Sem permissão." };
  if (id === current.id) return { error: "Você não pode alterar seu próprio status." };

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ ativo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracoes/acesso");
  return { error: null };
}

export async function excluirMembro(id: string): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (!["admin", "supervisor"].includes(current.role)) return { error: "Sem permissão." };
  if (id === current.id) return { error: "Você não pode excluir sua própria conta." };

  const supabase = createClient();

  // Remove dados relacionados
  const { data: prof } = await supabase
    .from("profissionais")
    .select("id")
    .eq("profile_id", id)
    .maybeSingle();
  if (prof?.id) {
    await supabase.from("agendamentos").delete().eq("profissional_id", prof.id);
  }
  await supabase.from("profissionais").delete().eq("profile_id", id);
  await supabase.from("profiles").delete().eq("id", id);

  // Remove também do Auth — essencial para que o usuário possa se recadastrar
  // (sem isso o trigger handle_new_user não dispara no próximo login OAuth)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.deleteUser(id);
  if (authError) return { error: authError.message };

  revalidatePath("/configuracoes/acesso");
  return { error: null };
}

export async function criarUsuario(formData: FormData): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Sem permissão." };

  const email       = formData.get("email") as string;
  const password    = formData.get("password") as string;
  const nome_completo = formData.get("nome_completo") as string;
  const telefone    = (formData.get("telefone") as string) || null;
  const role        = (formData.get("role") as string) || "secretaria";

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome_completo, telefone },
  });
  if (error) return { error: error.message };

  if (data.user) {
    await adminClient
      .from("profiles")
      .update({ role, nome_completo, telefone })
      .eq("id", data.user.id);
  }

  revalidatePath("/configuracoes/acesso");
  return { error: null };
}

export async function aprovarPendente(
  profileId: string,
  novoRole: UserRole
): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Apenas administradores podem aprovar usuários." };

  const supabase = createClient();

  // Busca email e nome antes de aprovar para o email de notificação
  const { data: perfil } = await supabase
    .from("profiles")
    .select("email, nome_completo")
    .eq("id", profileId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({ role: novoRole, ativo: true })
    .eq("id", profileId);

  if (error) return { error: error.message };

  // Envia email de aprovação (falha silenciosa — não bloqueia o fluxo)
  if (perfil?.email) {
    try {
      const { sendEmail, emailAprovacaoHtml } = await import("@/lib/email");
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await sendEmail({
        to: perfil.email,
        subject: "Seu acesso foi aprovado — Espaço Wendler",
        html: emailAprovacaoHtml(perfil.nome_completo ?? "", siteUrl),
      });
    } catch (emailErr) {
      console.error("[aprovarPendente] Falha ao enviar email:", emailErr);
    }
  }

  revalidatePath("/configuracoes/acesso");
  return { error: null };
}

export async function editarUsuarioCompleto(
  id: string,
  formData: FormData
): Promise<{ error: string | null }> {
  const current = await getCurrentProfile();
  if (current.role !== "admin") return { error: "Sem permissão." };

  const nome_completo = formData.get("nome_completo") as string;
  const email         = formData.get("email") as string;
  const telefone      = (formData.get("telefone") as string) || null;
  const role          = formData.get("role") as string;
  const ativo         = formData.get("ativo") === "true";

  const supabase = createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ nome_completo, email, telefone, role, ativo })
    .eq("id", id);
  if (profileError) return { error: profileError.message };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(id, { email });
  if (authError) return { error: authError.message };

  revalidatePath("/configuracoes/acesso");
  return { error: null };
}
