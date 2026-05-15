"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Pencil, Calendar, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { deletarAgendamentoClient, deletarAgendamentosPaciente } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  agendado:   "bg-peach/30 text-rust",
  confirmado: "bg-forest text-cream",
  realizado:  "bg-teal-600 text-white",
  finalizado: "bg-gray-200 text-gray-600",
  cancelado:  "bg-rust/10 text-rust",
  faltou:     "bg-orange-100 text-orange-700",
  ausencia:   "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado", realizado: "Realizado",
  finalizado: "Finalizado", cancelado: "Falta Justificada", faltou: "Falta Cobrada",
};

interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: string;
  observacoes?: string | null;
  paciente: { id: string; nome_completo: string; telefone?: string } | null;
  profissional: { id: string; profile: { nome_completo: string } | null } | null;
}
interface Profissional { id: string; profile: { nome_completo: string } | null }

interface Props {
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  canEdit: boolean;
}

interface ModalProps {
  agendamento: Agendamento;
  onClose: () => void;
  onDeleted: (id: string, todos: boolean, pacienteNome: string) => void;
}

function ModalExcluir({ agendamento, onClose, onDeleted }: ModalProps) {
  const [isPending, startTransition] = useTransition();
  const [todosDoP, setTodosDoP] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pacienteNome = agendamento.paciente?.nome_completo ?? "";

  function handleConfirm() {
    startTransition(async () => {
      setErro(null);
      if (todosDoP && agendamento.paciente?.id) {
        const res = await deletarAgendamentosPaciente(agendamento.paciente.id);
        if (res.error) { setErro(res.error); return; }
        onDeleted(agendamento.id, true, pacienteNome);
      } else {
        const res = await deletarAgendamentoClient(agendamento.id);
        if (res.error) { setErro(res.error); return; }
        onDeleted(agendamento.id, false, pacienteNome);
      }
      onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rust/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rust" />
            </div>
            <div>
              <p className="font-display text-lg text-forest">Excluir agendamento</p>
              <p className="text-sm text-forest-600 mt-1">
                {format(new Date(agendamento.data_hora_inicio), "d 'de' MMMM, HH:mm", { locale: ptBR })} —{" "}
                <strong>{pacienteNome || "—"}</strong>
              </p>
            </div>
          </div>

          {pacienteNome && (
            <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={todosDoP}
                onChange={e => setTodosDoP(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-rust shrink-0"
              />
              <span className="text-sm text-amber-800">
                Excluir <strong>todos</strong> os agendamentos de <strong>{pacienteNome}</strong>
              </span>
            </label>
          )}

          <ErrorBanner message={erro} />

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 bg-rust text-cream px-4 py-2 rounded-xl text-sm font-medium hover:bg-rust/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isPending ? "Excluindo…" : todosDoP ? "Excluir todos" : "Sim, excluir"}
            </button>
            <button onClick={onClose} disabled={isPending} className="btn-secondary flex-1">Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function AgendaClient({ agendamentos: initial, profissionais, canEdit }: Props) {
  const [agendamentos, setAgendamentos] = useState(initial);
  const [busca, setBusca] = useState("");
  const [filtroProf, setFiltroProf] = useState("todos");
  const [excluindo, setExcluindo] = useState<Agendamento | null>(null);

  function handleDeleted(id: string, todos: boolean, pacienteNome: string) {
    if (todos) {
      setAgendamentos(prev => prev.filter(a => a.paciente?.nome_completo !== pacienteNome));
    } else {
      setAgendamentos(prev => prev.filter(a => a.id !== id));
    }
  }

  const filtrados = useMemo(() => {
    return agendamentos.filter(a => {
      const matchProf = filtroProf === "todos" || a.profissional?.id === filtroProf;
      const termo = busca.toLowerCase();
      const matchBusca = !termo ||
        a.paciente?.nome_completo?.toLowerCase().includes(termo) ||
        a.profissional?.profile?.nome_completo?.toLowerCase().includes(termo);
      return matchProf && matchBusca;
    });
  }, [agendamentos, filtroProf, busca]);

  const grupos: Record<string, Agendamento[]> = {};
  filtrados.forEach(a => {
    const key = format(new Date(a.data_hora_inicio), "yyyy-MM-dd");
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(a);
  });

  return (
    <div>
      {excluindo && (
        <ModalExcluir
          agendamento={excluindo}
          onClose={() => setExcluindo(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
          <input
            type="text"
            placeholder="Buscar por paciente ou profissional…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={filtroProf}
          onChange={e => setFiltroProf(e.target.value)}
          className="h-9 text-sm border border-sand/40 rounded-lg px-3 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="todos">Todos os profissionais</option>
          {profissionais.map(p => (
            <option key={p.id} value={p.id}>{p.profile?.nome_completo ?? p.id}</option>
          ))}
        </select>
      </div>

      {Object.keys(grupos).length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
          <h3 className="font-display text-2xl text-forest mb-2">Nenhum resultado</h3>
          <p className="text-forest-600 mb-6">
            {busca || filtroProf !== "todos"
              ? "Nenhum agendamento com esse filtro."
              : "Comece criando seu primeiro agendamento."}
          </p>
          {canEdit && !busca && filtroProf === "todos" && (
            <Link href="/agenda/novo" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Criar agendamento
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grupos).map(([data, itens]) => (
            <section key={data}>
              <h2 className="font-display text-xl text-forest mb-3">
                {format(new Date(data + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <div className="card p-0 overflow-hidden">
                <ul className="divide-y divide-sand/20">
                  {itens.map(a => (
                    <li key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream/40 transition-colors">
                      <div className="w-16 text-center shrink-0">
                        <p className="font-display text-xl text-forest">
                          {format(new Date(a.data_hora_inicio), "HH:mm")}
                        </p>
                        <p className="font-mono text-xs text-forest-500">
                          {format(new Date(a.data_hora_fim), "HH:mm")}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-forest truncate">{a.paciente?.nome_completo ?? "—"}</p>
                        <p className="text-sm text-forest-600 truncate">
                          com {a.profissional?.profile?.nome_completo ?? "—"}
                          {a.paciente?.telefone && <> · {a.paciente.telefone}</>}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE[a.status] ?? STATUS_BADGE.agendado}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Link
                            href={`/agenda/${a.id}/editar`}
                            className="p-2 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors"
                            title="Editar agendamento"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setExcluindo(a)}
                            className="p-2 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust transition-colors"
                            title="Excluir agendamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
