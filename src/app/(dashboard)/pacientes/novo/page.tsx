import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { NovoPacienteForm } from "./NovoPacienteForm";

export default async function NovoPacientePage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = createClient();

  const [{ data: configsRaw }, { data: profissionaisRaw }] = await Promise.all([
    supabase.from("configuracoes_campos_paciente").select("campo, obrigatorio"),
    supabase.from("profissionais").select("id, profile:profiles(nome_completo)").eq("ativo", true).order("id"),
  ]);

  const camposConfig = (configsRaw ?? []) as { campo: string; obrigatorio: boolean }[];
  const profissionais = (profissionaisRaw ?? []).map((p: any) => ({
    id: p.id,
    nome_completo: p.profile?.nome_completo ?? "—",
  }));

  const fromAgenda = searchParams.from === "agenda";

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <Link
        href={fromAgenda ? "/agenda/novo" : "/pacientes"}
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {fromAgenda ? "Voltar para agendamento" : "Voltar para pacientes"}
      </Link>

      <PageHeader
        eyebrow="Cadastro"
        title="Novo Paciente"
        description="Preencha os dados do paciente"
      />

      <NovoPacienteForm camposConfig={camposConfig} profissionais={profissionais} fromAgenda={fromAgenda} />
    </div>
  );
}
