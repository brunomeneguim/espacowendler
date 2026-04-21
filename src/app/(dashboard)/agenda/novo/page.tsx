import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { NovoAgendamentoForm } from "./NovoAgendamentoForm";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: { error?: string; data?: string; hora?: string; sala_id?: string };
}) {
  const supabase = createClient();

  const [{ data: profsRaw }, { data: pacs }, { data: salas }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo, role), especialidade:especialidades(nome)")
      .eq("ativo", true)
      .order("id"),
    supabase
      .from("pacientes")
      .select("id, nome_completo, telefone")
      .eq("ativo", true)
      .order("nome_completo"),
    supabase
      .from("salas")
      .select("id, nome")
      .eq("ativo", true)
      .order("id"),
  ]);

  const profs = (profsRaw ?? [])
    .filter((p: any) => p.profile?.role !== "secretaria")
    .map((p: any) => ({
      id: p.id,
      nome: p.profile?.nome_completo ?? p.id,
      especialidade: p.especialidade?.nome ?? undefined,
    }));

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link href="/agenda" className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar para agenda
      </Link>

      <PageHeader
        eyebrow="Novo"
        title="Agendar atendimento"
        description="Preencha os dados para criar o agendamento"
      />

      <NovoAgendamentoForm
        profs={profs}
        pacs={(pacs ?? []) as any}
        salas={(salas ?? []) as any}
        defaultData={searchParams.data ?? hoje}
        defaultHora={searchParams.hora ?? "09:00"}
        defaultSalaId={searchParams.sala_id ?? ""}
        error={searchParams.error}
      />
    </div>
  );
}
