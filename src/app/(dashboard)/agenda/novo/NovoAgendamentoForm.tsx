"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RepeatIcon, Loader2, UserPlus } from "lucide-react";
import { criarAgendamento } from "../actions";

interface Prof  { id: string; nome: string; especialidade?: string }
interface Pac   { id: string; nome_completo: string; telefone?: string }
interface Sala  { id: number; nome: string }

interface Props {
  profs: Prof[];
  pacs: Pac[];
  salas: Sala[];
  defaultData: string;
  defaultHora: string;
  defaultSalaId: string;
  defaultPacienteId?: string;
  error?: string;
}

export function NovoAgendamentoForm({ profs, pacs, salas, defaultData, defaultHora, defaultSalaId, defaultPacienteId, error }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [repetir, setRepetir] = useState(false);
  const [recorrencia, setRecorrencia] = useState<"semanal" | "quinzenal" | "mensal">("semanal");
  const [mensal_tipo, setMensalTipo] = useState<"dia_semana" | "dia_mes">("dia_semana");
  const [meses, setMeses] = useState("3");
  const [submitError, setSubmitError] = useState(error ?? "");
  const [tzOffset, setTzOffset] = useState(0);

  useEffect(() => { setTzOffset(new Date().getTimezoneOffset()); }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!repetir) {
      fd.set("recorrencia", "nenhuma");
    }
    if (recorrencia === "mensal") {
      fd.set("mensal_tipo", mensal_tipo);
    }
    setSubmitError("");
    startTransition(async () => {
      const res = await criarAgendamento(fd);
      if (res && "error" in res && res.error) setSubmitError(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <input type="hidden" name="tz_offset" value={tzOffset} />
      {submitError && (
        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {decodeURIComponent(submitError)}
        </div>
      )}

      {/* Profissional */}
      <div>
        <label htmlFor="profissional_id" className="label">Profissional <span className="text-rust">*</span></label>
        <select id="profissional_id" name="profissional_id" required className="input-field" defaultValue="">
          <option value="" disabled>Selecione um profissional</option>
          {profs.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        {profs.length === 0 && <p className="text-xs text-rust mt-1">Nenhum profissional ativo encontrado.</p>}
      </div>

      {/* Paciente */}
      <div>
        <label htmlFor="paciente_id" className="label">Paciente <span className="text-rust">*</span></label>
        {pacs.length === 0 ? (
          <div className="p-4 bg-peach/10 border border-peach/30 rounded-xl text-sm text-rust">
            Nenhum paciente cadastrado.{" "}
            <Link href="/pacientes/novo?from=agenda" className="font-medium underline">Cadastrar paciente</Link>
          </div>
        ) : (
          <div className="flex items-stretch gap-2">
            <select id="paciente_id" name="paciente_id" required className="input-field flex-1" defaultValue={defaultPacienteId ?? ""}>
              <option value="" disabled>Selecione um paciente</option>
              {pacs.map(p => (
                <option key={p.id} value={p.id}>{p.nome_completo}</option>
              ))}
            </select>
            <Link
              href="/pacientes/novo?from=agenda"
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-sand/40 hover:bg-forest/5 text-forest-500 hover:text-forest transition-colors"
              title="Cadastrar novo paciente"
            >
              <UserPlus className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Sala */}
      <div>
        <label htmlFor="sala_id" className="label">Sala de atendimento <span className="text-rust">*</span></label>
        <select id="sala_id" name="sala_id" required className="input-field" defaultValue={defaultSalaId}>
          <option value="" disabled>Selecione a sala</option>
          {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>

      {/* Data / Hora / Duração */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="data" className="label">Data <span className="text-rust">*</span></label>
          <input id="data" name="data" type="date" required className="input-field" defaultValue={defaultData} />
        </div>
        <div>
          <label htmlFor="hora" className="label">Horário <span className="text-rust">*</span></label>
          <input id="hora" name="hora" type="time" required className="input-field" defaultValue={defaultHora} />
        </div>
        <div>
          <label htmlFor="duracao" className="label">Duração (min)</label>
          <input id="duracao" name="duracao" type="number" min="15" step="5" defaultValue="60" className="input-field" />
        </div>
      </div>

      {/* Repetição */}
      <div className="rounded-xl border border-sand/40">
        <button
          type="button"
          onClick={() => setRepetir(v => !v)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${repetir ? "bg-forest/5 rounded-b-none" : "hover:bg-sand/10"}`}
        >
          <div className="flex items-center gap-2">
            <RepeatIcon className={`w-4 h-4 ${repetir ? "text-forest" : "text-forest-400"}`} />
            <span className={`text-sm font-medium ${repetir ? "text-forest" : "text-forest-500"}`}>
              Repetir agendamento
            </span>
            {repetir && (
              <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full">Ativo</span>
            )}
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${repetir ? "bg-forest" : "bg-gray-200"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${repetir ? "translate-x-5" : "translate-x-0"}`} />
          </div>
        </button>

        {repetir && (
          <div className="px-4 pb-4 pt-3 border-t border-sand/30 grid sm:grid-cols-2 gap-4 bg-forest/[0.02] rounded-b-xl">
            <input type="hidden" name="recorrencia" value={recorrencia} />
            <input type="hidden" name="meses_recorrencia" value={meses} />
            <input type="hidden" name="mensal_tipo" value={mensal_tipo} />
            <div>
              <label className="label">Frequência</label>
              <div className="flex rounded-xl border border-sand/40 overflow-hidden text-sm">
                {([
                  ["semanal", "Semanal"],
                  ["quinzenal", "Quinzenal"],
                  ["mensal", "Mensal"],
                ] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRecorrencia(v)}
                    className={`flex-1 py-2 text-sm transition-colors border-r border-sand/40 last:border-r-0 ${recorrencia === v ? "bg-forest text-cream font-medium" : "hover:bg-sand/20 text-forest-600"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Sub-opções mensais */}
              {recorrencia === "mensal" && (
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-forest-500 uppercase tracking-wider">Critério mensal</label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => setMensalTipo("dia_semana")}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${mensal_tipo === "dia_semana" ? "border-forest" : "border-sand/60"}`}
                    >
                      {mensal_tipo === "dia_semana" && <div className="w-2 h-2 rounded-full bg-forest" />}
                    </div>
                    <span className="text-sm text-forest-700">Considerar dia da semana</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => setMensalTipo("dia_mes")}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${mensal_tipo === "dia_mes" ? "border-forest" : "border-sand/60"}`}
                    >
                      {mensal_tipo === "dia_mes" && <div className="w-2 h-2 rounded-full bg-forest" />}
                    </div>
                    <span className="text-sm text-forest-700">Considerar dia do mês</span>
                  </label>
                </div>
              )}
            </div>
            <div>
              <label className="label">Repetir por</label>
              <select
                value={meses}
                onChange={e => setMeses(e.target.value)}
                className="input-field"
              >
                <option value="1">1 mês</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
              <p className="text-xs text-forest-400 mt-1.5">
                {recorrencia === "semanal"   && `${parseInt(meses) * 4} sessões no total`}
                {recorrencia === "quinzenal" && `${parseInt(meses) * 2} sessões no total`}
                {recorrencia === "mensal"    && `${meses} sessões no total`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Observações */}
      <div>
        <label htmlFor="observacoes" className="label">
          Observações <span className="text-forest-400">(opcional)</span>
        </label>
        <textarea id="observacoes" name="observacoes" rows={3} className="input-field resize-none"
          placeholder="Algo importante sobre este atendimento?" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending || pacs.length === 0} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? "Agendando…" : repetir ? "Agendar sessões" : "Agendar sessão"}
        </button>
        <Link href="/dashboard" className="btn-ghost">Cancelar</Link>
      </div>
    </form>
  );
}
