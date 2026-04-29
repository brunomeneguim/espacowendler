import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { AcessoClient } from "./AcessoClient";

export default async function ControleAcessoPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const supabase = createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome_completo, email, role, ativo")
    .order("nome_completo");

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
      />
    </div>
  );
}
