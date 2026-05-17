import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Segurança: garante que o profile existe.
      // Pode estar ausente se o admin excluiu o profile mas o auth.user ficou
      // (caso legado) ou se o trigger falhou por algum motivo.
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();

        const meta = (data.user.raw_user_meta_data ?? {}) as Record<string, string>;
        const nome = [meta.nome_completo, meta.full_name, meta.name, data.user.email]
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .find((v) => v !== "") ?? "";

        const { count } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const role = (count ?? 0) === 0 ? "admin" : "pendente";

        await adminClient.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          nome_completo: nome || null,
          avatar_url: meta.avatar_url ?? null,
          role,
          ativo: role === "admin",
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Falha no code exchange → volta para login com erro
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Falha na autenticação com Google. Tente novamente.")}`
  );
}
