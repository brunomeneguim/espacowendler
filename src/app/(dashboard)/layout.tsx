import { Sidebar } from "@/components/Sidebar";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Profissional sem perfil completo → forçar completar cadastro
  if (profile.role === "profissional") {
    const pathname = headers().get("x-pathname") ?? "";
    if (!pathname.startsWith("/profissionais/completar")) {
      const supabase = createClient();
      const { data: profReg } = await supabase
        .from("profissionais")
        .select("perfil_completo")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (!profReg || !profReg.perfil_completo) {
        redirect("/profissionais/completar");
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar role={profile.role} nome={profile.nome_completo} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
