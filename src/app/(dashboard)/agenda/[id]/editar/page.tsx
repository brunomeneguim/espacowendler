import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { editarAgendamento, excluirAgendamento } from "../../actions";

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
      .select("id, data_hora_inicio, data_hora_fim, status, observacoes, profissional_id, paciente_id, sala_id")
      .eq("id", params.id)
      .single(),
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo), especialidade:especialidades(nome)")
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

  const editAction = editarAgendamento.bind(null, params.id);

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

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action={editAction} className="card space-y-5">
        <div>
          <label htmlFor="profissional_id" className="label">Profissional</label>
          <select id="profissional_id" name="profissional_id" required className="input-field" defaultValue={ag.profissional_id}>
            {(profs ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.profile?.nome_completo}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="paciente_id" className="label">Paciente</label>
          <select id="paciente_id" name="paciente_id" required className="input-field" defaultValue={ag.paciente_id}>
            {(pacs ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.nome_completo}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sala_id" className="label">Sala de atendimento</label>
          <select id="sala_id" name="sala_id" className="input-field" defaultValue={ag.sala_id ?? ""}>
            <option value="">Sem sala definida</option>
            {(salas ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="data" className="label">Data</label>
            <input id="data" name="data" type="date" required className="input-field" defaultValue={dataStr} />
          </div>
          <div>
            <label htmlFor="hora" className="label">Horário</label>
            <input id="hora" name="hora" type="time" required className="input-field" defaultValue={horaStr} />
          </div>
          <div>
            <label htmlFor="duracao" className="label">Duração (min)</label>
            <input id="duracao" name="duracao" type="number" min="15" step="5" className="input-field" defaultValue={duracaoMin} />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" required className="input-field" defaultValue={ag.status}>
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="realizado">Realizado</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Falta Justificada</option>
            <option value="faltou">Falta Cobrada</option>
          </select>
        </div>

        <div>
          <label htmlFor="observacoes" className="label">
            Observações
          </label>
          <textarea id="observacoes" name="observacoes" rows={3} className="input-field resize-none" defaultValue={ag.observacoes ?? ""} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">Salvar alterações</button>
          <Link href="/dashboard" className="btn-ghost">Cancelar</Link>
        </div>
      </form>

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
