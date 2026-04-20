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
  const canEdit = ["admin", "supervisor", "secretaria"].includes(profile.role);
  const canConfig = ["admin", "supervisor"].includes(profile.role);

  const [{ data: pacientes }, { data: configsRaw }] = await Promise.all([
    supabase
      .from("pacientes")
      .select("id, nome_completo, email, telefone, cpf, data_nascimento, ativo")
      .eq("ativo", true)
      .order("nome_completo"),
    supabase
      .from("configuracoes_campos_paciente")
      .select("campo, obrigatorio"),
  ]);

  const camposConfig = (configsRaw ?? []) as { campo: string; obrigatorio: boolean }[];

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
              Novo paciente
            </Link>
          )}
        </div>
      </PageHeader>

      <PacientesClient
        pacientes={(pacientes as any) ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
