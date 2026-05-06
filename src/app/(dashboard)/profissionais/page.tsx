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
  const canDelete = ["admin", "supervisor"].includes(profile.role);

  const [{ data: profissionaisRaw }, { data: especialidades }, { data: configsRaw }] =
    await Promise.all([
      supabase
        .from("profissionais")
        .select(
          "id, profile_id, registro_profissional, valor_plano, telefone_1, ativo, foto_url, cor, data_nascimento, profile:profiles(nome_completo, email), especialidades:profissional_especialidades(especialidade:especialidades(nome))"
        ),
      supabase.from("especialidades").select("id, nome").order("nome"),
      supabase.from("configuracoes_campos_profissional").select("campo, obrigatorio"),
    ]);

  // Profissional e supervisor têm o próprio card em primeiro; outros vêem em ordem alfabética
  const ownProfId = (profile.role === "profissional" || profile.role === "supervisor")
    ? ((profissionaisRaw ?? []) as any[]).find((p: any) => p.profile_id === profile.id)?.id ?? null
    : null;

  // Ordena alfabeticamente por nome_completo
  const profissionais = [...((profissionaisRaw ?? []) as any[])].sort((a, b) => {
    const nA = (a.profile?.nome_completo ?? "").toLowerCase();
    const nB = (b.profile?.nome_completo ?? "").toLowerCase();
    return nA.localeCompare(nB, "pt-BR");
  });

  // Coloca o próprio card no início (profissional e supervisor)
  if (ownProfId) {
    const idx = profissionais.findIndex((p: any) => p.id === ownProfId);
    if (idx > 0) profissionais.unshift(...profissionais.splice(idx, 1));
  }

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
              Cadastrar Profissional
            </Link>
          </div>
        )}
      </PageHeader>

      <ProfissionaisClient
        profissionais={(profissionais as any) ?? []}
        canManage={canManage}
        canDelete={canDelete}
        ownProfId={ownProfId}
      />
    </div>
  );
}
