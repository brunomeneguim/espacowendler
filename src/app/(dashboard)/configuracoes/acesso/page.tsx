import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { AcessoClient } from "./AcessoClient";

export default async function ControleAcessoPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = createClient();

  const [{ data: profiles }, { data: todasPermissoes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome_completo, email, role, ativo")
      .order("nome_completo"),
    supabase
      .from("permissoes_usuario")
      .select("profile_id, pagina, pode_ver, pode_editar"),
  ]);

  const permissoesPorPerfil: Record<string, Record<string, { podeVer: boolean; podeEditar: boolean }>> = {};
  for (const p of (todasPermissoes ?? [])) {
    if (!permissoesPorPerfil[p.profile_id]) permissoesPorPerfil[p.profile_id] = {};
    permissoesPorPerfil[p.profile_id][p.pagina] = { podeVer: p.pode_ver, podeEditar: p.pode_editar };
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <PageHeader
        eyebrow="Configurações"
        title="Controle de Acesso"
        description="Gerencie os níveis de permissão de cada usuário do sistema"
      />
      <AcessoClient
        profiles={(profiles as any) ?? []}
        currentId={profile.id}
        permissoesPorPerfil={permissoesPorPerfil}
      />
    </div>
  );
}
