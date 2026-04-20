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
  Pencil,
  CalendarDays,
  Clock,
  DoorOpen,
} from "lucide-react";
import { atualizarStatusAgendamento } from "../agenda/actions";

// ── Constantes do grid ──────────────────────────────────────────
const HORA_INICIO = 8;
const HORA_FIM = 22;
const PX_POR_HORA = 60;
const TOTAL_HORAS = HORA_FIM - HORA_INICIO; // 14

// ── Tipos ───────────────────────────────────────────────────────
type Status = "agendado" | "confirmado" | "realizado" | "cancelado" | "faltou";
type ViewMode = "semana" | "dia";

interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: Status;
  observacoes?: string | null;
  paciente: { id: string; nome_completo: string; telefone?: string } | null;
  profissional: { id: string; profile: { nome_completo: string } | null } | null;
  sala: { id: number; nome: string } | null;
}

interface Profissional {
  id: string;
  profile: { nome_completo: string } | null;
}

interface HorarioDisponivel {
  profissional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
}

interface Sala {
  id: number;
  nome: string;
}

interface Props {
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  horariosDisponiveis: HorarioDisponivel[];
  salas: Sala[];
  weekStart: Date;
  userRole: string;
}

// ── Cores por status ────────────────────────────────────────────
const STATUS: Record<Status, { label: string; card: string; dot: string; badge: string }> = {
  agendado:   { label: "Agendado",   card: "bg-blue-50 border-blue-200 text-blue-900",       dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700"    },
  confirmado: { label: "Confirmado", card: "bg-green-50 border-green-200 text-green-900",    dot: "bg-green-500",  badge: "bg-green-100 text-green-700"  },
  realizado:  { label: "Realizado",  card: "bg-teal-50 border-teal-200 text-teal-900",       dot: "bg-teal-500",   badge: "bg-teal-100 text-teal-700"    },
  cancelado:  { label: "Cancelado",  card: "bg-red-50 border-red-200 text-red-800",          dot: "bg-red-400",    badge: "bg-red-100 text-red-600"      },
  faltou:     { label: "Faltou",     card: "bg-orange-50 border-orange-200 text-orange-900", dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700" },
};

const BORDA_PROF = [
  "border-l-blue-500", "border-l-violet-500", "border-l-teal-500", "border-l-rose-500",
  "border-l-amber-500", "border-l-cyan-600",  "border-l-fuchsia-500","border-l-lime-600",
];

const BG_PROF_LIGHT = [
  "bg-blue-500", "bg-violet-500", "bg-teal-500", "bg-rose-500",
  "bg-amber-500","bg-cyan-600",   "bg-fuchsia-500","bg-lime-600",
];

// Cores pastel para salas (usadas no grid de slots)
const SALA_BG: Record<number, string> = {
  1: "bg-sky-50 hover:bg-sky-100 border-sky-200",
  2: "bg-violet-50 hover:bg-violet-100 border-violet-200",
  3: "bg-amber-50 hover:bg-amber-100 border-amber-200",
  4: "bg-rose-50 hover:bg-rose-100 border-rose-200",
};

function parseTimeToMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

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
  canEdit: boolean;
}

function AgendamentoCard({ ag, style, bordaProf, expanded, onToggle, onStatus, pending, canEdit }: CardProps) {
  const cfg = STATUS[ag.status] ?? STATUS.agendado;
  const ativo = ag.status === "agendado" || ag.status === "confirmado";

  return (
    <div
      style={style}
      className={`absolute rounded border-l-4 ${bordaProf} ${cfg.card} border cursor-pointer overflow-hidden transition-shadow hover:shadow-md select-none ${expanded ? "z-20 shadow-lg" : "z-10"} ${pending ? "opacity-60 pointer-events-none" : ""}`}
      onClick={onToggle}
    >
      <div className="px-1.5 py-0.5 leading-tight">
        <p className="text-xs font-semibold truncate">
          {format(new Date(ag.data_hora_inicio), "HH:mm")} {ag.paciente?.nome_completo ?? "—"}
        </p>
        <p className="text-[10px] opacity-60 truncate">
          {ag.profissional?.profile?.nome_completo}
          {ag.sala ? ` · ${ag.sala.nome}` : ""}
        </p>
      </div>

      {expanded && (
        <div className="px-1.5 pb-1 flex flex-wrap gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
          {ativo && ag.status === "agendado" && (
            <button onClick={() => onStatus("confirmado")} className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Confirmar
            </button>
          )}
          {ativo && ag.status === "confirmado" && (
            <button onClick={() => onStatus("realizado")} className="text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Finalizar
            </button>
          )}
          {ativo && (
            <>
              <button onClick={() => onStatus("faltou")} className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <UserX className="w-3 h-3" /> Faltou
              </button>
              <button onClick={() => onStatus("cancelado")} className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <XCircle className="w-3 h-3" /> Cancelar
              </button>
            </>
          )}
          {canEdit && (
            <Link href={`/agenda/${ag.id}/editar`} className="text-xs bg-forest text-cream px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Pencil className="w-3 h-3" /> Editar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Slot vazio clicável ─────────────────────────────────────────
interface SlotProps {
  dia: Date;
  hora: number;
  salaId?: number;
  salaNome?: string;
  salaClass?: string;
}

function SlotVazio({ dia, hora, salaId, salaNome, salaClass }: SlotProps) {
  const dataStr = format(dia, "yyyy-MM-dd");
  const horaStr = `${String(hora).padStart(2, "0")}:00`;
  const href = `/agenda/novo?data=${dataStr}&hora=${horaStr}${salaId ? `&sala_id=${salaId}` : ""}`;

  return (
    <Link
      href={href}
      className={`absolute left-0 right-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group border border-dashed rounded cursor-pointer ${salaClass ?? "border-gray-200 hover:bg-forest/5 hover:border-forest/30"}`}
      style={{ top: (hora - HORA_INICIO) * PX_POR_HORA + 1, height: PX_POR_HORA - 2, zIndex: 1 }}
      title={`Agendar às ${horaStr}${salaNome ? ` · ${salaNome}` : ""}`}
    >
      <span className="flex items-center gap-1 text-xs text-forest/60 group-hover:text-forest font-medium">
        <Plus className="w-3.5 h-3.5" />
        {horaStr}
        {salaNome && <span className="text-forest/40">· {salaNome}</span>}
      </span>
    </Link>
  );
}

// ── Coluna de um dia ────────────────────────────────────────────
interface ColunaProps {
  dia: Date;
  ags: Agendamento[];
  horariosParaDia: HorarioDisponivel[];
  mostrarHorarios: boolean;
  profColorMap: Map<string, string>;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onStatus: (id: string, s: Status) => void;
  pending: boolean;
  canEdit: boolean;
  salas: Sala[];
  filtroProfId: string;
}

function DiaColuna({ dia, ags, horariosParaDia, mostrarHorarios, profColorMap, expandedId, onToggle, onStatus, pending, canEdit, salas, filtroProfId }: ColunaProps) {
  const colMap = calcularColunas(ags);
  const horas = Array.from({ length: TOTAL_HORAS }, (_, i) => HORA_INICIO + i);

  // Quais slots têm agendamento ativo (para não exibir o "+" em cima)
  const slotsOcupados = new Set<number>();
  ags.forEach((ag) => {
    if (ag.status === "cancelado" || ag.status === "faltou") return;
    const h = new Date(ag.data_hora_inicio).getHours();
    slotsOcupados.add(h);
  });

  return (
    <div className="relative flex-1 min-w-0" style={{ height: TOTAL_HORAS * PX_POR_HORA }}>
      {/* Linhas de hora */}
      {horas.map((h) => (
        <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: (h - HORA_INICIO) * PX_POR_HORA }} />
      ))}

      {/* Faixas de horário disponível */}
      {mostrarHorarios && horariosParaDia.map((h, i) => {
        const startMin = parseTimeToMinutes(h.hora_inicio) - HORA_INICIO * 60;
        const endMin   = parseTimeToMinutes(h.hora_fim)   - HORA_INICIO * 60;
        if (startMin >= TOTAL_HORAS * 60 || endMin <= 0) return null;
        const top    = (Math.max(0, startMin) / 60) * PX_POR_HORA;
        const height = ((Math.min(TOTAL_HORAS * 60, endMin) - Math.max(0, startMin)) / 60) * PX_POR_HORA;
        return <div key={i} className="absolute left-0 right-0 bg-green-50 border-l-2 border-green-200" style={{ top, height, zIndex: 0 }} />;
      })}

      {/* Slots clicáveis (somente horas sem agendamento) */}
      {horas.map((h) => {
        if (slotsOcupados.has(h)) return null;
        // Se há salas definidas e nenhum profissional filtrado, mostrar sem sala específica
        return (
          <SlotVazio
            key={h}
            dia={dia}
            hora={h}
          />
        );
      })}

      {/* Cards de agendamento */}
      {ags.map((ag) => {
        const inicio = new Date(ag.data_hora_inicio);
        const fim = new Date(ag.data_hora_fim);
        const inicioMin = (inicio.getHours() - HORA_INICIO) * 60 + inicio.getMinutes();
        const duracaoMin = (fim.getTime() - inicio.getTime()) / 60000;
        const top = (inicioMin / 60) * PX_POR_HORA;
        const height = Math.max(22, (duracaoMin / 60) * PX_POR_HORA - 2);
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
            canEdit={canEdit}
          />
        );
      })}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────
export function CalendarioSemanal({ agendamentos, profissionais, horariosDisponiveis, salas, weekStart, userRole }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("semana");
  const [filtroProf, setFiltroProf] = useState("todos");
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const hoje = new Date();
    const wd = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
    return wd.find((d) => isSameDay(d, hoje)) ?? weekStart;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canEdit = ["admin", "supervisor", "secretaria"].includes(userRole);

  const profColorMap = new Map(profissionais.map((p, i) => [p.id, BORDA_PROF[i % BORDA_PROF.length]]));
  const profBgMap = new Map(profissionais.map((p, i) => [p.id, BG_PROF_LIGHT[i % BG_PROF_LIGHT.length]]));

  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
  const hoje = format(new Date(), "yyyy-MM-dd");
  const horas = Array.from({ length: TOTAL_HORAS }, (_, i) => HORA_INICIO + i);

  const agsFiltrados = agendamentos.filter(
    (a) => filtroProf === "todos" || a.profissional?.id === filtroProf
  );

  function agsParaDia(dia: Date) {
    return agsFiltrados.filter((a) => isSameDay(new Date(a.data_hora_inicio), dia));
  }

  function horariosParaDia(dia: Date): HorarioDisponivel[] {
    const ds = dia.getDay();
    if (filtroProf === "todos") return [];
    return horariosDisponiveis.filter((h) => h.profissional_id === filtroProf && h.dia_semana === ds);
  }

  function navSemana(delta: 1 | -1) {
    const nova = delta === 1 ? addWeeks(weekStart, 1) : subWeeks(weekStart, 1);
    router.push(`/dashboard?semana=${format(nova, "yyyy-MM-dd")}`);
  }

  function irParaHoje() {
    const hojeDate = new Date();
    setSelectedDay(hojeDate);
    setViewMode("dia");
    const isCurrent = weekDays.some((d) => isSameDay(d, hojeDate));
    if (!isCurrent) router.push("/dashboard");
  }

  function handleStatus(id: string, novoStatus: Status) {
    startTransition(async () => {
      await atualizarStatusAgendamento(id, novoStatus);
      setExpandedId(null);
    });
  }

  const isCurrentWeek = weekDays.some((d) => format(d, "yyyy-MM-dd") === hoje);
  const agendadosHoje = agendamentos.filter(
    (a) => isSameDay(new Date(a.data_hora_inicio), new Date()) &&
           ["agendado", "confirmado"].includes(a.status)
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-forest-500 mb-0.5">Agenda</p>
          <h1 className="font-display text-2xl text-forest">
            {viewMode === "semana"
              ? `${format(weekDays[0], "d MMM", { locale: ptBR })} – ${format(weekDays[5], "d 'de' MMMM yyyy", { locale: ptBR })}`
              : format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h1>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-sand/40 rounded-xl px-3 py-2">
            <CalendarDays className="w-4 h-4 text-forest-500" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-forest-500 leading-none">Hoje</p>
              <p className="text-lg font-semibold text-forest leading-tight">{agendadosHoje}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-sand/40 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-forest-500" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-forest-500 leading-none">Semana</p>
              <p className="text-lg font-semibold text-forest leading-tight">{agsFiltrados.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => navSemana(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={irParaHoje}
          className={`px-3 h-8 text-sm rounded-lg border transition-colors ${
            isCurrentWeek && viewMode === "dia" && format(selectedDay, "yyyy-MM-dd") === hoje
              ? "bg-forest text-cream border-forest"
              : "border-sand/40 hover:bg-sand/20 text-forest"
          }`}
        >
          Hoje
        </button>
        <button onClick={() => navSemana(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1" />

        {/* Dia / Semana */}
        <div className="flex rounded-lg border border-sand/40 overflow-hidden text-sm">
          {(["dia", "semana"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 h-8 flex items-center gap-1.5 transition-colors border-r border-sand/40 last:border-r-0 ${viewMode === mode ? "bg-forest text-cream" : "hover:bg-sand/20 text-forest"}`}
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
            <option key={p.id} value={p.id}>{p.profile?.nome_completo ?? p.id}</option>
          ))}
        </select>

        <Link href="/agenda/novo" className="btn-primary h-8 flex items-center gap-1.5 text-sm px-3">
          <Plus className="w-4 h-4" /> Novo agendamento
        </Link>
      </div>

      {/* ── Grid ── */}
      <div className="rounded-xl border border-sand/30 bg-white overflow-auto">
        {viewMode === "semana" ? (
          /* ── Vista semanal ── */
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

            {weekDays.map((dia, i) => {
              const isHoje = format(dia, "yyyy-MM-dd") === hoje;
              const agsDay = agsParaDia(dia);
              const ativos = agsDay.filter((a) => ["agendado", "confirmado"].includes(a.status)).length;
              return (
                <div key={i} className="flex-1 min-w-0 border-r border-gray-100 last:border-r-0 flex flex-col">
                  <div
                    className={`h-10 border-b border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${isHoje ? "bg-forest/5" : ""}`}
                    onClick={() => { setSelectedDay(dia); setViewMode("dia"); }}
                  >
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide capitalize">
                      {format(dia, "EEE", { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-semibold ${isHoje ? "text-forest" : "text-gray-700"}`}>
                        {format(dia, "d")}
                      </span>
                      {ativos > 0 && (
                        <span className="text-[10px] bg-forest/10 text-forest rounded-full px-1 leading-4">{ativos}</span>
                      )}
                    </div>
                  </div>
                  <div className="relative px-0.5">
                    <DiaColuna
                      dia={dia}
                      ags={agsDay}
                      horariosParaDia={horariosParaDia(dia)}
                      mostrarHorarios={filtroProf !== "todos"}
                      profColorMap={profColorMap}
                      expandedId={expandedId}
                      onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                      onStatus={handleStatus}
                      pending={isPending}
                      canEdit={canEdit}
                      salas={salas}
                      filtroProfId={filtroProf}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Vista diária ── */
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
                  dia={selectedDay}
                  ags={agsParaDia(selectedDay)}
                  horariosParaDia={horariosParaDia(selectedDay)}
                  mostrarHorarios={filtroProf !== "todos"}
                  profColorMap={profColorMap}
                  expandedId={expandedId}
                  onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                  onStatus={handleStatus}
                  pending={isPending}
                  canEdit={canEdit}
                  salas={salas}
                  filtroProfId={filtroProf}
                />
              </div>
            </div>

            {/* Resumo do dia */}
            <div className="border-t border-gray-100 p-4">
              <p className="text-xs font-medium text-forest-500 uppercase tracking-wider mb-3">
                Resumo — {agsParaDia(selectedDay).length} atendimento(s)
              </p>
              {filtroProf !== "todos" && horariosParaDia(selectedDay).length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {horariosParaDia(selectedDay).map((h, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Disponível: {h.hora_inicio.slice(0, 5)} – {h.hora_fim.slice(0, 5)}
                    </span>
                  ))}
                </div>
              )}
              {agsParaDia(selectedDay).length === 0 ? (
                <p className="text-sm text-forest-400">Nenhum agendamento para este dia.</p>
              ) : (
                <div className="space-y-2">
                  {agsParaDia(selectedDay)
                    .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime())
                    .map((ag) => {
                      const cfg = STATUS[ag.status] ?? STATUS.agendado;
                      const profIdx = profissionais.findIndex((p) => p.id === ag.profissional?.id);
                      const profColor = BG_PROF_LIGHT[profIdx % BG_PROF_LIGHT.length];
                      return (
                        <div key={ag.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className={`w-1.5 h-8 rounded-full ${profColor} shrink-0`} />
                          <div className="w-16 text-center shrink-0">
                            <p className="text-sm font-semibold text-forest">{format(new Date(ag.data_hora_inicio), "HH:mm")}</p>
                            <p className="text-xs text-forest-400">{format(new Date(ag.data_hora_fim), "HH:mm")}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-forest truncate">{ag.paciente?.nome_completo ?? "—"}</p>
                            <p className="text-xs text-forest-500 truncate">
                              {ag.profissional?.profile?.nome_completo}
                              {ag.sala ? ` · ${ag.sala.nome}` : ""}
                              {ag.paciente?.telefone ? ` · ${ag.paciente.telefone}` : ""}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          {canEdit && (
                            <Link href={`/agenda/${ag.id}/editar`} className="shrink-0 p-1.5 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Legenda ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS).map(([key, cfg]) => (
            <span key={key} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${cfg.card}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
          ))}
        </div>
        {filtroProf !== "todos" && (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-green-50 border-green-200 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-400" /> Horário disponível
          </span>
        )}
        {salas.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-forest-500">
            <DoorOpen className="w-3.5 h-3.5" />
            {salas.map((s) => s.nome).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
