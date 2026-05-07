import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toaster";
import { PrivacyProvider } from "./PrivacyContext";
import { PermissoesProvider } from "./PermissoesContext";
import { PerfilCompletoProvider } from "./PerfilCompletoContext";
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
  let perfilCompleto = true;
  if (profile.role === "profissional") {
    const pathname = headers().get("x-pathname") ?? "";
    const { data: profReg } = await supabase
      .from("profissionais")
      .select("perfil_completo")
      .eq("profile_id", profile.id)
      .maybeSingle();
    perfilCompleto = !!(profReg?.perfil_completo);
    if (!perfilCompleto && !pathname.startsWith("/profissionais/completar")) {
      redirect("/profissionais/completar");
    }
  }

  const [{ data: menuConfig }, { data: permissoesData }] = await Promise.all([
    supabase
      .from("menu_config")
      .select("id, href, label, icon_name, ordem")
      .order("ordem", { ascending: true }),
    supabase
      .from("permissoes_usuario")
      .select("pagina, pode_ver, pode_editar")
      .eq("profile_id", profile.id),
  ]);

  const permissoes = Object.fromEntries(
    (permissoesData ?? []).map(p => [p.pagina, { podeVer: p.pode_ver, podeEditar: p.pode_editar }])
  );

  return (
    <div className="flex min-h-screen bg-cream">
      <ToastProvider>
        <PrivacyProvider>
          <PermissoesProvider permissoes={permissoes}>
            <PerfilCompletoProvider value={perfilCompleto}>
              <Sidebar
                role={profile.role}
                nome={profile.nome_completo}
                menuConfig={(menuConfig as any) ?? []}
              />
              <main className="flex-1 min-w-0">{children}</main>
            </PerfilCompletoProvider>
          </PermissoesProvider>
        </PrivacyProvider>
      </ToastProvider>
    </div>
  );
}
