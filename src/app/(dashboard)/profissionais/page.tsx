import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Plus } from "lucide-react";
import { ProfissionaisClient } from "./ProfissionaisClient";
import { ConfigEspecialidadesButton } from "./ConfigEspecialidadesButton";
import { ConfigCamposProfButton } from "./ConfigCamposProfButton";

export default async function ProfissionaisPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const canManage = ["admin", "supervisor"].includes(profile.role);

  const [{ data: profissionais }, { data: especialidades }, { data: configsRaw }] =
    await Promise.all([
      supabase
        .from("profissionais")
        .select(
          "id, registro_profissional, valor_consulta, ativo, foto_url, profile:profiles(nome_completo, email), especialidade:especialidades(nome)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("especialidades").select("id, nome").order("nome"),
      supabase.from("configuracoes_campos_profissional").select("campo, obrigatorio"),
    ]);

  const camposConfig = (configsRaw ?? []) as { campo: string; obrigatorio: boolean }[];

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <PageHeader
        eyebrow="Equipe"
        title="Profissionais"
        description="Cadastro de quem atende na clínica"
      >
        {canManage && (
          <div className="flex items-center gap-2">
            <ConfigCamposProfButton initialConfigs={camposConfig} />
            <ConfigEspecialidadesButton especialidades={especialidades ?? []} />
            <Link href="/profissionais/novo" className="btn-primary">
              <Plus className="w-4 h-4" />
              Cadastrar profissional
            </Link>
          </div>
        )}
      </PageHeader>

      <ProfissionaisClient
        profissionais={(profissionais as any) ?? []}
        canManage={canManage}
      />
    </div>
  );
}
