"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/errorMessages";
import { headers } from "next/headers";

export async function signIn(formData: FormData) {
  const supabase = createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData): Promise<{ error: string | null; message?: string }> {
  const supabase = createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nome_completo = formData.get("nome_completo") as string;
  const telefone = formData.get("telefone") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome_completo, telefone },
    },
  });

  if (error) {
    return { error: friendlyError(error.message) };
  }

  // O profile é criado automaticamente via trigger no banco (ver SQL)
  if (data.user && !data.user.email_confirmed_at) {
    return { error: null, message: "Conta criada! Verifique seu email para confirmar." };
  }

  // Usuário recém-criado fica pendente até aprovação do admin
  revalidatePath("/", "layout");
  redirect("/aguardando");
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const origin = headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(friendlyError(error.message))}`);
  }
  if (data.url) redirect(data.url);
  redirect(`/login?error=${encodeURIComponent("Não foi possível iniciar o login com Google.")}`);
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("[signOut] Erro ao encerrar sessão:", error.message);
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
