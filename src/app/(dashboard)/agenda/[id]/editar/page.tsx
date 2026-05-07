import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { excluirAgendamento } from "../../actions";
import { EditarAgendamentoFormClient } from "./EditarAgendamentoFormClient";

export default async function EditarAgendamentoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const profile = await getCurrentProfile();
  if (!["admin", "supervisor", "secretaria"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = createClient();

  const [{ data: ag }, { data: profs }, { data: pacs }, { data: salas }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, data_hora_inicio, data_hora_fim, status, observacoes, profissional_id, paciente_id, sala_id, tipo_agendamento")
      .eq("id", params.id)
      .single(),
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo, role), profissional_especialidades(especialidade:especialidades(nome))")
      .eq("ativo", true),
    supabase
      .from("pacientes")
      .select("id, nome_completo, telefone")
      .order("nome_completo"),
    supabase
      .from("salas")
      .select("id, nome")
      .eq("ativo", true)
      .order("id"),
  ]);

  if (!ag) notFound();

  const inicioDate = new Date(ag.data_hora_inicio);
  const fimDate = new Date(ag.data_hora_fim);
  const duracaoMin = Math.round((fimDate.getTime() - inicioDate.getTime()) / 60000);
  const dataStr = format(inicioDate, "yyyy-MM-dd");
  const horaStr = format(inicioDate, "HH:mm");

  const profsFormatted = (profs ?? [])
    .filter((p: any) => p.profile?.role !== "secretaria")
    .map((p: any) => ({ id: p.id, nome: p.profile?.nome_completo ?? "—" }));

  const salasFormatted = (salas ?? []).map((s: any) => ({ id: s.id, nome: s.nome }));

  const pacienteNome = (pacs ?? []).find((p: any) => p.id === ag.paciente_id)?.nome_completo ?? "—";

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <Link
        href="/agenda"
        className="inline-flex items-center gap-2 text-sm text-forest-600 hover:text-forest mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para agenda
      </Link>

      <PageHeader
        eyebrow="Editar"
        title="Agendamento"
        description="Altere os dados do atendimento"
      />

      <EditarAgendamentoFormClient
        id={params.id}
        tipoAgendamento={ag.tipo_agendamento ?? "consulta_avulsa"}
        defaultProfissionalId={ag.profissional_id}
        defaultPacienteId={ag.paciente_id}
        defaultPacienteNome={pacienteNome}
        defaultSalaId={ag.sala_id ? String(ag.sala_id) : null}
        defaultData={dataStr}
        defaultHora={horaStr}
        defaultDuracao={duracaoMin}
        defaultStatus={ag.status}
        defaultObservacoes={ag.observacoes ?? ""}
        profs={profsFormatted}
        salas={salasFormatted}
        canDelete={profile.role === "admin"}
      />

      {profile.role === "admin" && (
        <div className="mt-6 p-4 border border-rust/20 rounded-xl bg-rust/5">
          <p className="text-sm font-medium text-rust mb-2">Zona de perigo</p>
          <p className="text-xs text-rust/70 mb-3">Esta ação é irreversível. O agendamento será excluído permanentemente.</p>
          <form action={excluirAgendamento.bind(null, params.id)}>
            <button type="submit" className="text-sm bg-rust text-cream px-4 py-2 rounded-lg hover:bg-rust/90 transition-colors">
              Excluir agendamento
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
