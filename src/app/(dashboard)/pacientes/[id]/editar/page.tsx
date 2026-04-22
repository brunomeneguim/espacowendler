import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { EditarPacienteForm } from "./EditarPacienteForm";

export default async function EditarPacientePage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor", "secretaria"].includes(profile.role)) {
    redirect("/pacientes");
  }

  const supabase = createClient();

  const [{ data: pac }, { data: camposConfig }] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", params.id).single(),
    supabase.from("configuracoes_campos_paciente").select("campo, obrigatorio"),
  ]);

  if (!pac) notFound();

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para pacientes
      </Link>

      <PageHeader
        eyebrow="Editar"
        title={pac.nome_completo}
        description="Altere os dados do paciente"
      />

      <EditarPacienteForm
        paciente={pac}
        camposConfig={camposConfig ?? []}
      />
    </div>
  );
}
