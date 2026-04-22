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
  const supabase = createClient();

  // Profissional sem perfil completo → forçar completar cadastro
  if (profile.role === "profissional") {
    const pathname = headers().get("x-pathname") ?? "";
    const deveVerificar = pathname !== "" && !pathname.startsWith("/profissionais/completar");
    if (deveVerificar) {
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

  // Fetch menu config (ordered)
  const { data: menuConfig } = await supabase
    .from("menu_config")
    .select("id, href, label, icon_name, ordem")
    .order("ordem", { ascending: true });

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar
        role={profile.role}
        nome={profile.nome_completo}
        menuConfig={(menuConfig as any) ?? []}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
