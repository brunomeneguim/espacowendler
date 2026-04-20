import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { criarAgendamento } from "../actions";
import { ArrowLeft } from "lucide-react";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: { error?: string; data?: string; hora?: string; sala_id?: string };
}) {
  const supabase = createClient();

  const [{ data: profs }, { data: pacs }, { data: salas }] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, profile:profiles(nome_completo), especialidade:especialidades(nome)")
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

  const hoje = new Date().toISOString().split("T")[0];

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
        eyebrow="Novo"
        title="Agendar atendimento"
        description="Preencha os dados para criar o agendamento"
      />

      {searchParams.error && (
        <div className="mb-5 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action={criarAgendamento} className="card space-y-5">
        <div>
          <label htmlFor="profissional_id" className="label">
            Profissional
          </label>
          <select
            id="profissional_id"
            name="profissional_id"
            required
            className="input-field"
            defaultValue=""
          >
            <option value="" disabled>
              Selecione um profissional
            </option>
            {(profs ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.profile?.nome_completo}
                {p.especialidade?.nome ? ` — ${p.especialidade.nome}` : ""}
              </option>
            ))}
          </select>
          {(profs ?? []).length === 0 && (
            <p className="text-xs text-rust mt-1">Nenhum profissional ativo encontrado.</p>
          )}
        </div>

        <div>
          <label htmlFor="paciente_id" className="label">
            Paciente
          </label>
          {(pacs ?? []).length === 0 ? (
            <div className="p-4 bg-peach/10 border border-peach/30 rounded-xl text-sm text-rust">
              Nenhum paciente cadastrado.{" "}
              <Link href="/pacientes/novo" className="font-medium underline">
                Cadastrar paciente
              </Link>
            </div>
          ) : (
            <select
              id="paciente_id"
              name="paciente_id"
              required
              className="input-field"
              defaultValue=""
            >
              <option value="" disabled>
                Selecione um paciente
              </option>
              {(pacs ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome_completo}
                  {p.telefone ? ` — ${p.telefone}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="sala_id" className="label">
            Sala de atendimento
          </label>
          <select
            id="sala_id"
            name="sala_id"
            required
            className="input-field"
            defaultValue={searchParams.sala_id ?? ""}
          >
            <option value="" disabled>
              Selecione a sala
            </option>
            {(salas ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="data" className="label">
              Data
            </label>
            <input
              id="data"
              name="data"
              type="date"
              required
              className="input-field"
              defaultValue={searchParams.data ?? hoje}
            />
          </div>
          <div>
            <label htmlFor="hora" className="label">
              Horário
            </label>
            <input
              id="hora"
              name="hora"
              type="time"
              required
              className="input-field"
              defaultValue={searchParams.hora ?? "09:00"}
            />
          </div>
          <div>
            <label htmlFor="duracao" className="label">
              Duração (min)
            </label>
            <input
              id="duracao"
              name="duracao"
              type="number"
              min="15"
              step="5"
              defaultValue="50"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="observacoes" className="label">
            Observações <span className="text-forest-400">(opcional)</span>
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            className="input-field resize-none"
            placeholder="Algo importante sobre este atendimento?"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            Agendar
          </button>
          <Link href="/agenda" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
