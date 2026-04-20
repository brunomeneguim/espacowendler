import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { NovoPacienteForm } from "./NovoPacienteForm";

export default async function NovoPacientePage() {
  const supabase = createClient();

  const { data: configsRaw } = await supabase
    .from("configuracoes_campos_paciente")
    .select("campo, obrigatorio");

  const camposConfig = (configsRaw ?? []) as { campo: string; obrigatorio: boolean }[];

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para pacientes
      </Link>

      <PageHeader
        eyebrow="Cadastro"
        title="Novo paciente"
        description="Preencha os dados do paciente"
      />

      <NovoPacienteForm camposConfig={camposConfig} />
    </div>
  );
}
