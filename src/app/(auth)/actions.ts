"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

export async function signUp(formData: FormData) {
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
    return redirect(`/cadastro?error=${encodeURIComponent(error.message)}`);
  }

  // O profile é criado automaticamente via trigger no banco (ver SQL)
  if (data.user && !data.user.email_confirmed_at) {
    return redirect(
      `/cadastro?message=${encodeURIComponent(
        "Conta criada! Verifique seu email para confirmar."
      )}`
    );
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
