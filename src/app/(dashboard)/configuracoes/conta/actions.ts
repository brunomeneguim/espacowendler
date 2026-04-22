"use server";
import { createClient } from "@/lib/supabase/server";

export async function alterarSenha(
  formData: FormData
): Promise<{ error: string | null; success?: boolean }> {
  const supabase = createClient();
  const nova_senha = formData.get("nova_senha") as string;
  if (!nova_senha || nova_senha.length < 6)
    return { error: "A senha deve ter no mínimo 6 caracteres." };
  const { error } = await supabase.auth.updateUser({ password: nova_senha });
  if (error) return { error: error.message };
  return { error: null, success: true };
}
