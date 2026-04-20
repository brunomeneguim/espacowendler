"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  UserX,
  XCircle,
  LayoutGrid,
  AlignLeft,
} from "lucide-react";
import { atualizarStatusAgendamento } from "../agenda/actions";

// ── Constantes do grid ──────────────────────────────────────────
const HORA_INICIO = 7;
const HORA_FIM = 20;
const PX_POR_HORA = 64;
const TOTAL_HORAS = HORA_FIM - HORA_INICIO;

// ── Tipos ───────────────────────────────────────────────────────
type Status = "agendado" | "confirmado" | "realizado" | "cancelado" | "faltou";

interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: Status;
  paciente: { nome_completo: string } | null;
  profissional: {
    id: string;
    profile: { nome_completo: string } | null;
  } | null;
}

interface Profissional {
  id: string;
  profile: { nome_completo: string } | null;
}

// ── Cores por status ────────────────────────────────────────────
const STATUS: Record<Status, { label: string; card: string; dot: string }> = {
  agendado:   { label: "Agendado",   card: "bg-blue-50 border-blue-200 text-blue-900",   dot: "bg-blue-400"   },
  confirmado: { label: "Confirmado", card: "bg-green-50 border-green-200 text-green-900", dot: "bg-green-500"  },
  realizado:  { label: "Realizado",  card: "bg-teal-50 border-teal-200 text-teal-900",   dot: "bg-teal-500"   },
  cancelado:  { label: "Cancelado",  card: "bg-red-50 border-red-200 text-red-800",      dot: "bg-red-400"    },
  faltou:     { label: "Faltou",     card: "bg-orange-50 border-orange-200 text-orange-900", dot: "bg-orange-400" },
};

// Cor da borda esquerda por profissional (rotativa)
const BORDA_PROF = [
  "border-l-blue-500",
  "border-l-violet-500",
  "border-l-teal-500",
  "border-l-rose-500",
  "border-l-amber-500",
  "border-l-cyan-600",
  "border-l-fuchsia-500",
  "border-l-lime-600",
];

// ── Detecção de sobreposição ────────────────────────────────────
function calcularColunas(ags: Agendamento[]): Map<string, { col: number; total: number }> {
  const sorted = [...ags].sort(
    (a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime()
  );
  const map = new Map<string, { col: number; total: number }>();
  const fimPorColuna: Date[] = [];

  for (const ag of sorted) {
    const inicio = new Date(ag.data_hora_inicio);
    const fim = new Date(ag.data_hora_fim);
    let col = 0;
    while (col < fimPorColuna.length && fimPorColuna[col] > inicio) col++;
    fimPorColuna[col] = fim;
    map.set(ag.id, { col, total: 1 });
  }

  for (const [idA, vA] of map) {
    const agA = ags.find((a) => a.id === idA)!;
    const iA = new Date(agA.data_hora_inicio).getTime();
    const fA = new Date(agA.data_hora_fim).getTime();
    let maxCol = vA.col;
    for (const [idB, vB] of map) {
      if (idA === idB) continue;
      const agB = ags.find((a) => a.id === idB)!;
      const iB = new Date(agB.data_hora_inicio).getTime();
      const fB = new Date(agB.data_hora_fim).getTime();
      if (iA < fB && fA > iB) maxCol = Math.max(maxCol, vB.col);
    }
    vA.total = maxCol + 1;
  }

  return map;
}

// ── Card de agendamento ─────────────────────────────────────────
interface CardProps {
  ag: Agendamento;
  style: React.CSSProperties;
  bordaProf: string;
  expanded: boolean;
  onToggle: () => void;
  onStatus: (s: Status) => void;
  pending: boolean;
}

function AgendamentoCard({ ag, style, bordaProf, expanded, onToggle, onStatus, pending }: CardProps) {
  const cfg = STATUS[ag.status] ?? STATUS.agendado;
  const ativo = ag.status === "agendado" || ag.status === "confirmado";

  return (
    <div
      style={style}
      className={`absolute rounded border-l-4 ${bordaProf} ${cfg.card} border cursor-pointer overflow-hidden transition-shadow hover:shadow-md ${expanded ? "z-20 shadow-lg" : "z-10"} ${pending ? "opacity-60 pointer-events-none" : ""}`}
      onClick={onToggle}
    >
      <div className="px-1.5 py-0.5">
        <p className="text-xs font-semibold leading-tight truncate">
          {format(new Date(ag.data_hora_inicio), "HH:mm")} – {ag.paciente?.nome_completo ?? "—"}
        </p>
        <p className="text-xs opacity-60 leading-tight truncate">
          {ag.profissional?.profile?.nome_completo ?? ""}
        </p>
      </div>

      {expanded && ativo && (
        <div
          className="px-1.5 pb-1 flex flex-wrap gap-1 mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {ag.status === "agendado" && (
            <button
              onClick={() => onStatus("confirmado")}
              className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"
            >
              <Check className="w-3 h-3" /> Confirmar
            </button>
          )}
          {ag.status === "confirmado" && (
            <button
              onClick={() => onStatus("realizado")}
              className="text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"
            >
              <Check className="w-3 h-3" /> Finalizar
            </button>
          )}
          <button
            onClick={() => onStatus("faltou")}
            className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"
          >
            <UserX className="w-3 h-3" /> Faltou
          </button>
          <button
            onClick={() => onStatus("cancelado")}
            className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"
          >
            <XCircle className="w-3 h-3" /> Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Coluna de um dia ────────────────────────────────────────────
interface ColunaProps {
  ags: Agendamento[];
  profColorMap: Map<string, string>;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onStatus: (id: string, s: Status) => void;
  pending: boolean;
}

function DiaColuna({ ags, profColorMap, expandedId, onToggle, onStatus, pending }: ColunaProps) {
  const colMap = calcularColunas(ags);
  const horas = Array.from({ length: TOTAL_HORAS }, (_, i) => HORA_INICIO + i);

  return (
    <div className="relative flex-1 min-w-0" style={{ height: TOTAL_HORAS * PX_POR_HORA }}>
      {horas.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 border-t border-gray-100"
          style={{ top: (h - HORA_INICIO) * PX_POR_HORA }}
        />
      ))}
      {ags.map((ag) => {
        const inicio = new Date(ag.data_hora_inicio);
        const fim = new Date(ag.data_hora_fim);
        const inicioMin = (inicio.getHours() - HORA_INICIO) * 60 + inicio.getMinutes();
        const duracaoMin = (fim.getTime() - inicio.getTime()) / 60000;
        const top = (inicioMin / 60) * PX_POR_HORA;
        const height = Math.max(24, (duracaoMin / 60) * PX_POR_HORA - 2);
        const { col, total } = colMap.get(ag.id) ?? { col: 0, total: 1 };

        return (
          <AgendamentoCard
            key={ag.id}
            ag={ag}
            style={{
              top: Math.max(0, top),
              height,
              left: `${(col / total) * 100}%`,
              width: `calc(${100 / total}% - 2px)`,
            }}
            bordaProf={profColorMap.get(ag.profissional?.id ?? "") ?? BORDA_PROF[0]}
            expanded={expandedId === ag.id}
            onToggle={() => onToggle(ag.id)}
            onStatus={(s) => onStatus(ag.id, s)}
            pending={pending}
          />
        );
      })}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────
interface Props {
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  weekStart: Date;
}

export function CalendarioSemanal({ agendamentos, profissionais, weekStart }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"semana" | "dia">("semana");
  const [filtroProf, setFiltroProf] = useState("todos");
  const [selectedDay, setSelectedDay] = useState<Date>(weekStart);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const profColorMap = new Map(
    profissionais.map((p, i) => [p.id, BORDA_PROF[i % BORDA_PROF.length]])
  );

  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Seg–Sáb
  const hoje = format(new Date(), "yyyy-MM-dd");
  const horas = Array.from({ length: TOTAL_HORAS }, (_, i) => HORA_INICIO + i);

  const agsFiltrados = agendamentos.filter(
    (a) => filtroProf === "todos" || a.profissional?.id === filtroProf
  );

  function agsParaDia(dia: Date) {
    return agsFiltrados.filter((a) => isSameDay(new Date(a.data_hora_inicio), dia));
  }

  function navSemana(delta: 1 | -1) {
    const nova = delta === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    router.push(`/dashboard?semana=${format(nova, "yyyy-MM-dd")}`);
  }

  function handleStatus(id: string, novoStatus: Status) {
    startTransition(async () => {
      await atualizarStatusAgendamento(id, novoStatus);
      setExpandedId(null);
    });
  }

  const isCurrentWeek = weekDays.some((d) => format(d, "yyyy-MM-dd") === hoje);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Navegação */}
        <button
          onClick={() => navSemana(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className={`px-3 h-8 text-sm rounded-lg border transition-colors ${
            isCurrentWeek
              ? "bg-forest text-cream border-forest"
              : "border-sand/40 hover:bg-sand/20 text-forest"
          }`}
        >
          Hoje
        </button>
        <button
          onClick={() => navSemana(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="font-display text-lg text-forest ml-1">
          {viewMode === "semana"
            ? `${format(weekDays[0], "d MMM", { locale: ptBR })} – ${format(weekDays[5], "d 'de' MMMM yyyy", { locale: ptBR })}`
            : format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </span>

        <div className="flex-1" />

        {/* Dia / Semana */}
        <div className="flex rounded-lg border border-sand/40 overflow-hidden text-sm">
          {(["dia", "semana"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 h-8 flex items-center gap-1.5 transition-colors border-r border-sand/40 last:border-r-0 ${
                viewMode === mode ? "bg-forest text-cream" : "hover:bg-sand/20 text-forest"
              }`}
            >
              {mode === "dia" ? <AlignLeft className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
              {mode === "dia" ? "Dia" : "Semana"}
            </button>
          ))}
        </div>

        {/* Filtro profissional */}
        <select
          value={filtroProf}
          onChange={(e) => setFiltroProf(e.target.value)}
          className="h-8 text-sm border border-sand/40 rounded-lg px-2 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
        >
          <option value="todos">Todos os profissionais</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.profile?.nome_completo ?? p.id}
            </option>
          ))}
        </select>

        <Link href="/agenda/novo" className="btn-primary h-8 flex items-center gap-1.5 text-sm px-3">
          <Plus className="w-4 h-4" /> Novo agendamento
        </Link>
      </div>

      {/* ── Grid ── */}
      <div className="rounded-xl border border-sand/30 bg-white overflow-auto">
        {viewMode === "semana" ? (
          <div className="flex min-w-[700px]">
            {/* Coluna de horas */}
            <div className="w-14 shrink-0 border-r border-gray-100">
              <div className="h-10 border-b border-gray-100" />
              {horas.map((h) => (
                <div key={h} className="relative" style={{ height: PX_POR_HORA }}>
                  <span className="absolute -top-2.5 left-1 text-[11px] text-gray-400">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDays.map((dia, i) => {
              const isHoje = format(dia, "yyyy-MM-dd") === hoje;
              return (
                <div key={i} className="flex-1 min-w-0 border-r border-gray-100 last:border-r-0 flex flex-col">
                  <div
                    className={`h-10 border-b border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 ${isHoje ? "bg-forest/5" : ""}`}
                    onClick={() => { setSelectedDay(dia); setViewMode("dia"); }}
                  >
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide capitalize">
                      {format(dia, "EEE", { locale: ptBR })}
                    </span>
                    <span className={`text-sm font-semibold ${isHoje ? "text-forest" : "text-gray-700"}`}>
                      {format(dia, "d")}
                    </span>
                  </div>
                  <div className="relative px-0.5">
                    <DiaColuna
                      ags={agsParaDia(dia)}
                      profColorMap={profColorMap}
                      expandedId={expandedId}
                      onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                      onStatus={handleStatus}
                      pending={isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vista dia
          <div>
            <div className="flex border-b border-gray-100 overflow-x-auto">
              <div className="w-14 shrink-0 border-r border-gray-100" />
              {weekDays.map((dia, i) => {
                const isSel = isSameDay(dia, selectedDay);
                const isHoje = format(dia, "yyyy-MM-dd") === hoje;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(dia)}
                    className={`flex-1 min-w-[70px] py-2 flex flex-col items-center border-r border-gray-100 last:border-r-0 transition-colors ${isSel ? "bg-forest/5" : "hover:bg-gray-50"}`}
                  >
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide capitalize">
                      {format(dia, "EEE", { locale: ptBR })}
                    </span>
                    <span className={`text-sm font-semibold ${isHoje ? "text-forest" : "text-gray-700"} ${isSel ? "underline decoration-2 underline-offset-2 decoration-forest" : ""}`}>
                      {format(dia, "d")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex min-w-0">
              <div className="w-14 shrink-0 border-r border-gray-100">
                {horas.map((h) => (
                  <div key={h} className="relative" style={{ height: PX_POR_HORA }}>
                    <span className="absolute -top-2.5 left-1 text-[11px] text-gray-400">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex-1 px-1">
                <DiaColuna
                  ags={agsParaDia(selectedDay)}
                  profColorMap={profColorMap}
                  expandedId={expandedId}
                  onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                  onStatus={handleStatus}
                  pending={isPending}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legenda ── */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS).map(([key, cfg]) => (
          <span
            key={key}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${cfg.card}`}
          >
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
