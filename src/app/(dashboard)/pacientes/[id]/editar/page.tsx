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

  const [
    { data: pac },
    { data: camposConfig },
    { data: profissionaisRaw },
    { data: vinculosRaw },
  ] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", params.id).single(),
    supabase.from("configuracoes_campos_paciente").select("campo, obrigatorio"),
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo)")
      .eq("ativo", true)
      .order("id"),
    supabase
      .from("paciente_profissional")
      .select("profissional:profissionais(id, profile:profiles(nome_completo))")
      .eq("paciente_id", params.id),
  ]);

  if (!pac) notFound();

  const profissionais = (profissionaisRaw ?? []).map((p: any) => ({
    id: p.id,
    nome_completo: p.profile?.nome_completo ?? "",
  }));

  const profissionaisVinculados = (vinculosRaw ?? []).map((v: any) => ({
    id: v.profissional?.id ?? "",
    nome_completo: v.profissional?.profile?.nome_completo ?? "",
  })).filter((p: any) => p.id);

  return (
    <div className="p-6 md:p-10 max-w-5xl">
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
        profissionais={profissionais}
        profissionaisVinculados={profissionaisVinculados}
      />
    </div>
  );
}
