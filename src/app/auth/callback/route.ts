import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redireciona para /aguardando — o layout do dashboard vai redirecionar
      // usuários com role válido normalmente para `next`.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Falha no code exchange → volta para login com erro
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Falha na autenticação com Google. Tente novamente.")}`);
}
