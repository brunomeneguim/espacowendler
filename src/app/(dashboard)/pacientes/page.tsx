import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Plus } from "lucide-react";
import { PacientesClient } from "./PacientesClient";
import { ConfigCamposButton } from "./ConfigCamposButton";

export default async function PacientesPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const isProfissional = profile.role === "profissional";
  const canEdit = ["admin", "supervisor", "secretaria", "profissional"].includes(profile.role);
  const canConfig = ["admin", "supervisor"].includes(profile.role);

  const [{ data: pacientes }, { data: configsRaw }, { data: profissionaisRaw }, { data: vinculos }] = await Promise.all([
    supabase
      .from("pacientes")
      .select("id, nome_completo, email, telefone, cpf, data_nascimento, ativo")
      .order("nome_completo"),
    supabase
      .from("configuracoes_campos_paciente")
      .select("campo, obrigatorio"),
    supabase
      .from("profissionais")
      .select("id, profile_id, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
    // Vínculos paciente → profissional(ais)
    supabase
      .from("paciente_profissional")
      .select("paciente_id, profissional_id"),
  ]);

  const camposConfig = (configsRaw ?? []) as { campo: string; obrigatorio: boolean }[];

  // Mapa paciente_id → nome(s) do(s) profissional(ais) vinculados (para exibição)
  const profNomeMap: Record<string, string> = {};
  for (const p of (profissionaisRaw ?? []) as any[]) {
    profNomeMap[p.id] = p.profile?.nome_completo ?? "—";
  }
  const pacienteProfMap: Record<string, string> = {};
  for (const v of (vinculos ?? []) as any[]) {
    const nome = profNomeMap[v.profissional_id];
    if (v.paciente_id && nome) {
      pacienteProfMap[v.paciente_id] = pacienteProfMap[v.paciente_id]
        ? `${pacienteProfMap[v.paciente_id]}, ${nome}`
        : nome;
    }
  }

  // Mapa paciente_id → [profissional_id, ...] (para filtro por ID)
  const pacienteProfIdMap: Record<string, string[]> = {};
  for (const v of (vinculos ?? []) as any[]) {
    if (v.paciente_id && v.profissional_id) {
      if (!pacienteProfIdMap[v.paciente_id]) pacienteProfIdMap[v.paciente_id] = [];
      pacienteProfIdMap[v.paciente_id].push(v.profissional_id);
    }
  }

  // Para profissionais: ID próprio e lista de pacientes vinculados
  const myProfId = isProfissional
    ? (((profissionaisRaw ?? []) as any[]).find((p: any) => p.profile_id === profile.id)?.id ?? null)
    : null;

  const myPatientIds: string[] = myProfId
    ? ((vinculos ?? []) as any[])
        .filter((v: any) => v.profissional_id === myProfId)
        .map((v: any) => v.paciente_id as string)
    : [];

  // Profissionais para o filtro, em ordem alfabética
  const profissionais = [...((profissionaisRaw ?? []) as any[])]
    .sort((a, b) => (a.profile?.nome_completo ?? "").localeCompare(b.profile?.nome_completo ?? "", "pt-BR"))
    .map((p: any) => ({ id: p.id, nome_completo: p.profile?.nome_completo ?? "—" }));

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <PageHeader
        eyebrow="Cadastro"
        title="Pacientes"
        description="Todas as pessoas atendidas pela clínica"
      >
        <div className="flex items-center gap-2">
          {canConfig && <ConfigCamposButton initialConfigs={camposConfig} />}
          {canEdit && (
            <Link href="/pacientes/novo" className="btn-primary">
              <Plus className="w-4 h-4" />
              Novo Paciente
            </Link>
          )}
        </div>
      </PageHeader>

      <PacientesClient
        pacientes={(pacientes as any) ?? []}
        canEdit={canEdit}
        profissionais={profissionais}
        pacienteProfMap={pacienteProfMap}
        pacienteProfIdMap={pacienteProfIdMap}
        myPatientIds={myPatientIds}
        myProfId={myProfId}
      />
    </div>
  );
}
