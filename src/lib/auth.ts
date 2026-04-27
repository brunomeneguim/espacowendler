import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<Profile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Encerra a sessão para quebrar o loop de redirect:
    // middleware redireciona /login→/dashboard quando usuário está autenticado,
    // mas sem perfil o dashboard voltaria a redirecionar para /login.
    try { await supabase.auth.signOut(); } catch { /* ignora */ }
    redirect("/login");
  }

  return profile as Profile;
}
