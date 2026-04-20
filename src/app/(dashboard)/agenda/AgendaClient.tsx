"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Pencil, Calendar, Plus } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  confirmado: "bg-forest text-cream",
  realizado:  "bg-teal-600 text-white",
  cancelado:  "bg-rust/10 text-rust",
  faltou:     "bg-orange-100 text-orange-700",
  agendado:   "bg-peach/30 text-rust",
};
const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado", realizado: "Realizado",
  cancelado: "Cancelado", faltou: "Faltou",
};

interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: string;
  observacoes?: string | null;
  paciente: { nome_completo: string; telefone?: string } | null;
  profissional: { id: string; profile: { nome_completo: string } | null } | null;
}
interface Profissional { id: string; profile: { nome_completo: string } | null }

interface Props {
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  canEdit: boolean;
}

export function AgendaClient({ agendamentos, profissionais, canEdit }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroProf, setFiltroProf] = useState("todos");

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
                        <Link
                          href={`/agenda/${a.id}/editar`}
                          className="shrink-0 p-2 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors"
                          title="Editar agendamento"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
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
