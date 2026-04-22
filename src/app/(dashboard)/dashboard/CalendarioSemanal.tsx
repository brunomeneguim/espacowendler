"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, addDays, addWeeks, subWeeks, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, Check, UserX, XCircle,
  LayoutGrid, AlignLeft, Pencil, CalendarDays, Clock,
  DoorOpen, X, Save, Loader2, Monitor, Trash2, RotateCcw,
} from "lucide-react";
import { atualizarStatusAgendamento, atualizarAgendamento, deletarAgendamentoClient } from "../agenda/actions";
import { PROF_CORES, getCorById } from "@/lib/profCores";

// ── Constantes ───────────────────────────────────────────────────
const HORA_INICIO = 7;
const HORA_FIM    = 22;
const PX_POR_HORA = 60;
const TOTAL_HORAS = HORA_FIM - HORA_INICIO;

// ── Tipos ────────────────────────────────────────────────────────
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
interface Profissional { id: string; cor?: string | null; profile: { nome_completo: string } | null }
interface Paciente     { id: string; nome_completo: string; telefone?: string }
interface HorarioDisponivel { profissional_id: string; dia_semana: number; hora_inicio: string; hora_fim: string }
interface Sala         { id: number; nome: string }

interface Props {
  agendamentos: Agendamento[];
  profissionais: Profissional[];
  pacientes: Paciente[];
  horariosDisponiveis: HorarioDisponivel[];
  salas: Sala[];
  weekStartStr: string;
  userRole: string;
}

// ── Status config ─────────────────────────────────────────────────
const STATUS: Record<Status, { label: string; card: string; dot: string; badge: string }> = {
  agendado:   { label: "Agendado",   card: "bg-blue-50 border-blue-200 text-blue-900",       dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-700"    },
  confirmado: { label: "Confirmado", card: "bg-green-50 border-green-200 text-green-900",    dot: "bg-green-500",  badge: "bg-green-100 text-green-700"  },
  realizado:  { label: "Realizado",  card: "bg-teal-50 border-teal-200 text-teal-900",       dot: "bg-teal-500",   badge: "bg-teal-100 text-teal-700"    },
  cancelado:  { label: "Falta Justificada", card: "bg-red-50 border-red-200 text-red-800",          dot: "bg-red-400",    badge: "bg-red-100 text-red-600"      },
  faltou:     { label: "Falta Cobrada",    card: "bg-orange-50 border-orange-200 text-orange-900", dot: "bg-orange-400", badge: "bg-orange-100 text-orange-700" },
};

const BORDA_PROF = PROF_CORES.map(c => c.border);
const BG_PROF    = PROF_CORES.map(c => c.bg);

// Seg a Sáb (sem domingo)
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6];

function parseTimeToMinutes(t: string) { const [h,m] = t.split(":").map(Number); return h*60+m; }

// Retorna true se a cor hex é escura (usa luminância relativa)
function isColorDark(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.5;
}

// ── Detecção de overlap ───────────────────────────────────────────
function calcularColunas(ags: Agendamento[]) {
  const sorted = [...ags].sort((a,b)=>new Date(a.data_hora_inicio).getTime()-new Date(b.data_hora_inicio).getTime());
  const map = new Map<string,{col:number;total:number}>();
  const fimPorCol: Date[] = [];
  for (const ag of sorted) {
    const ini=new Date(ag.data_hora_inicio), fim=new Date(ag.data_hora_fim);
    let col=0; while(col<fimPorCol.length && fimPorCol[col]>ini) col++;
    fimPorCol[col]=fim; map.set(ag.id,{col,total:1});
  }
  for (const [idA,vA] of map) {
    const agA=ags.find(a=>a.id===idA)!;
    const iA=new Date(agA.data_hora_inicio).getTime(), fA=new Date(agA.data_hora_fim).getTime();
    let maxCol=vA.col;
    for (const [idB,vB] of map) {
      if (idA===idB) continue;
      const agB=ags.find(a=>a.id===idB)!;
      const iB=new Date(agB.data_hora_inicio).getTime(), fB=new Date(agB.data_hora_fim).getTime();
      if (iA<fB && fA>iB) maxCol=Math.max(maxCol,vB.col);
    }
    vA.total=maxCol+1;
  }
  return map;
}

// ── Modal de edição ───────────────────────────────────────────────
interface EditModalProps {
  ag: Agendamento;
  profissionais: Profissional[];
  pacientes: Paciente[];
  salas: Sala[];
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ ag, profissionais, pacientes, salas, onClose, onSaved }: EditModalProps) {
  const inicio = new Date(ag.data_hora_inicio);
  const fim    = new Date(ag.data_hora_fim);
  const duracaoInicial = Math.round((fim.getTime()-inicio.getTime())/60000);

  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string|null>(null);
  const tzOffset = typeof window !== "undefined" ? new Date().getTimezoneOffset() : 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      const res = await atualizarAgendamento(
        ag.id,
        fd.get("profissional_id") as string,
        fd.get("paciente_id") as string,
        fd.get("sala_id") as string || null,
        fd.get("data") as string,
        fd.get("hora") as string,
        parseInt(fd.get("duracao") as string || "60"),
        fd.get("status") as string,
        fd.get("observacoes") as string || null,
        tzOffset,
      );
      if (res.error) { setErro(res.error); }
      else { onSaved(); onClose(); }
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sand/30 bg-cream/60">
          <div>
            <p className="text-xs uppercase tracking-wider text-forest-500">Editar agendamento</p>
            <p className="font-display text-lg text-forest leading-tight">{ag.paciente?.nome_completo ?? "—"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest/10 text-forest-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="edit-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {erro && <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">{erro}</div>}

          <div>
            <label className="label">Paciente</label>
            <select name="paciente_id" required className="input-field" defaultValue={ag.paciente?.id ?? ""}>
              <option value="" disabled>Selecione</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome_completo}{p.telefone ? ` — ${p.telefone}` : ""}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Profissional</label>
            <select name="profissional_id" required className="input-field" defaultValue={ag.profissional?.id ?? ""}>
              <option value="" disabled>Selecione</option>
              {profissionais.map(p => <option key={p.id} value={p.id}>{p.profile?.nome_completo ?? p.id}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Sala</label>
            <select name="sala_id" className="input-field" defaultValue={ag.sala?.id ?? ""}>
              <option value="">Sem sala</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data</label>
              <input name="data" type="date" required className="input-field" defaultValue={format(inicio, "yyyy-MM-dd")} />
            </div>
            <div>
              <label className="label">Horário</label>
              <input name="hora" type="time" required className="input-field" defaultValue={format(inicio, "HH:mm")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Duração (min)</label>
              <input name="duracao" type="number" min="15" step="5" required className="input-field" defaultValue={duracaoInicial} />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" required className="input-field" defaultValue={ag.status}>
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
                <option value="faltou">Faltou</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Observações <span className="text-forest-400">(opcional)</span></label>
            <textarea name="observacoes" rows={3} className="input-field resize-none" defaultValue={ag.observacoes ?? ""} />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-sand/30 bg-cream/40 flex gap-3">
          <button type="submit" form="edit-modal-form" disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
        </div>
      </div>
    </>
  );
}

// ── Card de agendamento ───────────────────────────────────────────
interface CardProps {
  ag: Agendamento;
  style: React.CSSProperties;
  bordaProf: string;
  profHex: string;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: Status) => void;
  onResizeStart: (agId: string, startY: number, durationMin: number, el: HTMLDivElement) => void;
  pending: boolean;
  canEdit: boolean;
}

function AgendamentoCard({ ag, style, bordaProf, profHex, onEdit, onDelete, onStatus, onResizeStart, pending, canEdit }: CardProps) {
  const cfg = STATUS[ag.status] ?? STATUS.agendado;
  const ativo = ag.status === "agendado" || ag.status === "confirmado";
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const bgColor = ag.status === "faltou" ? "#dc2626" : ag.status === "cancelado" ? "#ffffff" : profHex;
  const textColor = isColorDark(bgColor) ? "#ffffff" : "#1a1a1a";
  const textMuted = isColorDark(bgColor) ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.5)";

  const durationMin = Math.round((new Date(ag.data_hora_fim).getTime() - new Date(ag.data_hora_inicio).getTime()) / 60000);

  return (
    <div
      ref={cardRef}
      style={{ ...style, backgroundColor: bgColor, borderLeftColor: profHex }}
      className={`absolute rounded border-l-4 border cursor-pointer transition-shadow hover:shadow-md select-none ${expanded ? "z-30 shadow-lg overflow-visible" : "z-10 overflow-hidden"} ${pending ? "opacity-60 pointer-events-none" : ""}`}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="px-1.5 py-0.5 leading-tight flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: textColor }}>
            {format(new Date(ag.data_hora_inicio), "HH:mm")} {ag.paciente?.nome_completo ?? "—"}
          </p>
          <p className="text-[10px] truncate" style={{ color: textMuted }}>
            {ag.profissional?.profile?.nome_completo}
          </p>
        </div>
      </div>

      {expanded && (
        <div
          className="p-2 flex flex-col gap-1.5 bg-white rounded-b border border-t-0 border-gray-200 shadow-lg"
          style={{ position: "absolute", top: "100%", left: "-1px", right: "-1px", zIndex: 40 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Ações principais */}
          <div className="flex flex-col gap-1">
            {ativo && ag.status === "agendado" && (
              <button onClick={() => onStatus("confirmado")} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-green-600 text-white py-1.5 rounded-lg">
                <Check className="w-4 h-4" /> Confirmar
              </button>
            )}
            {ativo && ag.status === "confirmado" && (
              <button onClick={() => onStatus("realizado")} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-teal-600 text-white py-1.5 rounded-lg">
                <Check className="w-4 h-4" /> Finalizar sessão
              </button>
            )}
            {ativo && (
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => onStatus("faltou")} className="flex items-center justify-center gap-1 text-xs font-medium bg-red-600 text-white py-1.5 rounded-lg border border-red-600">
                  <UserX className="w-3.5 h-3.5" /> Falta Cobrada
                </button>
                <button onClick={() => onStatus("cancelado")} className="flex items-center justify-center gap-1 text-xs font-medium bg-white text-red-600 py-1.5 rounded-lg border border-red-600">
                  <XCircle className="w-3.5 h-3.5" /> Falta Justificada
                </button>
              </div>
            )}
          </div>

          {/* Desfazer / Editar / Excluir */}
          <div className="flex gap-1 pt-0.5 border-t border-gray-100">
            {(ag.status === "faltou" || ag.status === "cancelado" || ag.status === "confirmado") && (
              <button onClick={() => onStatus("agendado")} className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-600 bg-gray-100 py-1.5 rounded-lg border border-gray-200">
                <RotateCcw className="w-3.5 h-3.5" /> Desfazer
              </button>
            )}
            {canEdit && (
              <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 text-xs text-forest bg-forest/10 py-1.5 rounded-lg">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            )}
            {canEdit && (
              <button onClick={onDelete} className="flex items-center justify-center gap-1 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Handle de resize */}
      {canEdit && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2.5 cursor-s-resize flex items-center justify-center group/resize"
          onMouseDown={e => {
            e.stopPropagation();
            e.preventDefault();
            if (cardRef.current) onResizeStart(ag.id, e.clientY, durationMin, cardRef.current);
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="w-6 h-0.5 rounded-full bg-gray-400/50 group-hover/resize:bg-gray-600/70 transition-colors" />
        </div>
      )}
    </div>
  );
}

// ── Slot vazio clicável ───────────────────────────────────────────
function SlotVazio({ dia, hora, salaId }: { dia: Date; hora: number; salaId: number | null }) {
  const dataStr = format(dia, "yyyy-MM-dd");
  const horaStr = `${String(hora).padStart(2,"0")}:00`;
  const href = `/agenda/novo?data=${dataStr}&hora=${horaStr}${salaId ? `&sala_id=${salaId}` : ""}`;
  return (
    <Link
      href={href}
      className="absolute left-0 right-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group border border-dashed rounded border-gray-200 hover:bg-forest/5 hover:border-forest/30"
      style={{ top:(hora-HORA_INICIO)*PX_POR_HORA+1, height:PX_POR_HORA-2, zIndex:1 }}
      title={`Agendar às ${horaStr}`}
    >
      <span className="flex items-center gap-1 text-xs text-forest/60 group-hover:text-forest font-medium">
        <Plus className="w-3.5 h-3.5" /> {horaStr}
      </span>
    </Link>
  );
}

// ── Coluna de um dia ──────────────────────────────────────────────
interface ColunaProps {
  dia: Date;
  ags: Agendamento[];
  horariosParaDia: HorarioDisponivel[];
  mostrarHorarios: boolean;
  profColorMap: Map<string,string>;
  profHexMap: Map<string,string>;
  onEdit: (ag: Agendamento) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, s: Status) => void;
  onResizeStart: (agId: string, startY: number, durationMin: number, el: HTMLDivElement) => void;
  pending: boolean;
  canEdit: boolean;
  salaId: number | null;
}

function DiaColuna({ dia, ags, horariosParaDia, mostrarHorarios, profColorMap, profHexMap, onEdit, onDelete, onStatus, onResizeStart, pending, canEdit, salaId }: ColunaProps) {
  const colMap = calcularColunas(ags);
  const horas = Array.from({ length: TOTAL_HORAS }, (_, i) => HORA_INICIO + i);
  const slotsOcupados = new Set(
    ags.filter(a=>!["cancelado","faltou"].includes(a.status))
       .map(a => new Date(a.data_hora_inicio).getHours())
  );

  return (
    <div className="relative flex-1 min-w-0" style={{ height: TOTAL_HORAS * PX_POR_HORA }}>
      {horas.map(h => (
        <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top:(h-HORA_INICIO)*PX_POR_HORA }} />
      ))}

      {mostrarHorarios && horariosParaDia.map((h,i) => {
        const startMin = parseTimeToMinutes(h.hora_inicio) - HORA_INICIO*60;
        const endMin   = parseTimeToMinutes(h.hora_fim)   - HORA_INICIO*60;
        if (startMin >= TOTAL_HORAS*60 || endMin <= 0) return null;
        const top    = (Math.max(0, startMin)/60)*PX_POR_HORA;
        const height = ((Math.min(TOTAL_HORAS*60, endMin)-Math.max(0,startMin))/60)*PX_POR_HORA;
        return <div key={i} className="absolute left-0 right-0 bg-green-50 border-l-2 border-green-200" style={{ top, height, zIndex:0 }} />;
      })}

      {horas.map(h => slotsOcupados.has(h) ? null : <SlotVazio key={h} dia={dia} hora={h} salaId={salaId} />)}

      {ags.map(ag => {
        const ini = new Date(ag.data_hora_inicio), fim = new Date(ag.data_hora_fim);
        const inicioMin = (ini.getHours()-HORA_INICIO)*60 + ini.getMinutes();
        const duracaoMin = (fim.getTime()-ini.getTime())/60000;
        const top = (inicioMin/60)*PX_POR_HORA;
        const height = Math.max(22, (duracaoMin/60)*PX_POR_HORA - 2);
        const { col, total } = colMap.get(ag.id) ?? { col:0, total:1 };
        return (
          <AgendamentoCard
            key={ag.id}
            ag={ag}
            style={{ top:Math.max(0,top), height, left:`${(col/total)*100}%`, width:`calc(${100/total}% - 2px)` }}
            bordaProf={profColorMap.get(ag.profissional?.id ?? "") ?? BORDA_PROF[0]}
            profHex={profHexMap.get(ag.profissional?.id ?? "") ?? PROF_CORES[0].hex}
            onEdit={() => onEdit(ag)}
            onDelete={() => onDelete(ag.id)}
            onStatus={s => onStatus(ag.id, s)}
            onResizeStart={onResizeStart}
            pending={pending}
            canEdit={canEdit}
          />
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
export function CalendarioSemanal({ agendamentos, profissionais, pacientes, horariosDisponiveis, salas, weekStartStr, userRole }: Props) {
  const router = useRouter();
  const datePickerRef = useRef<HTMLInputElement>(null);

  // Parse weekStart from string in local time (avoids UTC timezone offset bug)
  const [y, m, d] = weekStartStr.split("-").map(Number);
  const weekStart = new Date(y, m - 1, d);

  const [viewMode, setViewMode] = useState<ViewMode>("semana");
  const [filtroProf, setFiltroProf] = useState("todos");
  const [filtroSalaId, setFiltroSalaId] = useState<number | null>(salas[0]?.id ?? null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const hoje = new Date();
    const wd = Array.from({length:6},(_,i)=>addDays(weekStart,i));
    return wd.find(d=>isSameDay(d,hoje)) ?? weekStart;
  });
  const [editingAg, setEditingAg] = useState<Agendamento|null>(null);
  const [isPending, startTransition] = useTransition();

  const canEdit = ["admin","supervisor","secretaria"].includes(userRole);

  // ── Drag to resize ──────────────────────────────────────────────
  const dragRef = useRef<{
    agId: string;
    startY: number;
    startDurationMin: number;
    el: HTMLDivElement;
    ag: Agendamento;
  } | null>(null);

  const handleResizeStart = useCallback((agId: string, startY: number, durationMin: number, el: HTMLDivElement) => {
    const ag = agendamentos.find(a => a.id === agId);
    if (!ag) return;
    dragRef.current = { agId, startY, startDurationMin: durationMin, el, ag };
    document.body.style.cursor = "s-resize";
    document.body.style.userSelect = "none";
  }, [agendamentos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const { startY, startDurationMin, el } = dragRef.current;
    const deltaY = e.clientY - startY;
    // 1px = 1 minute (PX_POR_HORA=60, 60min)
    const rawMin = startDurationMin + deltaY;
    // snap to 5 min, minimum 15 min
    const snappedMin = Math.max(15, Math.round(rawMin / 5) * 5);
    const newHeight = Math.max(22, (snappedMin / 60) * PX_POR_HORA - 2);
    el.style.height = `${newHeight}px`;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const { agId, startY, startDurationMin, ag } = dragRef.current;
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    const deltaY = e.clientY - startY;
    const rawMin = startDurationMin + deltaY;
    const snappedMin = Math.max(15, Math.round(rawMin / 5) * 5);
    if (snappedMin === startDurationMin) return;

    const tzOffset = new Date().getTimezoneOffset();
    const inicio = new Date(ag.data_hora_inicio);
    const data = format(inicio, "yyyy-MM-dd");
    const hora = format(inicio, "HH:mm");
    startTransition(async () => {
      await atualizarAgendamento(
        agId,
        ag.profissional?.id ?? "",
        ag.paciente?.id ?? "",
        ag.sala?.id ? String(ag.sala.id) : null,
        data,
        hora,
        snappedMin,
        ag.status,
        ag.observacoes ?? null,
        tzOffset,
      );
    });
  }, [startTransition]);

  // Usa a cor cadastrada do profissional, ou fallback por índice
  const profColorMap = new Map(profissionais.map((p, i) => [
    p.id,
    p.cor ? getCorById(p.cor).border : BORDA_PROF[i % BORDA_PROF.length],
  ]));
  const profBgMap = new Map(profissionais.map((p, i) => [
    p.id,
    p.cor ? getCorById(p.cor).bg : BG_PROF[i % BG_PROF.length],
  ]));
  const profHexMap = new Map(profissionais.map((p, i) => [
    p.id,
    p.cor ? getCorById(p.cor).hex : PROF_CORES[i % PROF_CORES.length].hex,
  ]));

  // Semana seg-sáb (sem domingo)
  const weekDays = Array.from({length:6},(_,i)=>addDays(weekStart,i))
    .filter(d => DIAS_SEMANA.includes(d.getDay()));

  const hoje = format(new Date(), "yyyy-MM-dd");
  const horas = Array.from({length:TOTAL_HORAS},(_,i)=>HORA_INICIO+i);

  // Filtrar por sala e profissional
  const agsFiltrados = agendamentos.filter(a => {
    // appointments without sala appear in all sala tabs
    const matchSala = filtroSalaId === null || a.sala === null || a.sala?.id === filtroSalaId;
    const matchProf = filtroProf === "todos" || a.profissional?.id === filtroProf;
    return matchSala && matchProf;
  });

  const agsParaDia  = (dia:Date) => agsFiltrados.filter(a=>isSameDay(new Date(a.data_hora_inicio),dia));
  const horariosParaDia = (dia:Date) => {
    if (filtroProf==="todos") return [];
    return horariosDisponiveis.filter(h=>h.profissional_id===filtroProf && h.dia_semana===dia.getDay());
  };

  function navSemana(delta: 1|-1) {
    const nova = delta===1 ? addWeeks(weekStart,1) : subWeeks(weekStart,1);
    router.push(`/dashboard?semana=${format(nova,"yyyy-MM-dd")}`);
  }

  function irParaHoje() {
    const hojeDate = new Date();
    if (!DIAS_SEMANA.includes(hojeDate.getDay())) return;
    setSelectedDay(hojeDate);
    // mantém o modo atual (semana ou dia)
    if (!weekDays.some(d => isSameDay(d, hojeDate))) {
      router.push("/dashboard");
    }
  }

  function handleStatus(id: string, novoStatus: Status) {
    startTransition(async () => {
      await atualizarStatusAgendamento(id, novoStatus);
      if (novoStatus === "realizado") {
        router.push("/agenda");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este agendamento? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => { await deletarAgendamentoClient(id); });
  }

  const isCurrentWeek = weekDays.some(d=>format(d,"yyyy-MM-dd")===hoje);
  const agendadosHoje = agendamentos.filter(a=> {
    const matchSala = filtroSalaId === null || a.sala === null || a.sala?.id === filtroSalaId;
    return matchSala && isSameDay(new Date(a.data_hora_inicio),new Date()) && ["agendado","confirmado"].includes(a.status);
  }).length;

  const salaAtual = salas.find(s => s.id === filtroSalaId);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-forest-500 mb-0.5">Agenda</p>
          <h1 className="font-display text-2xl text-forest">
            {viewMode==="semana"
              ? `${format(weekDays[0],"d MMM",{locale:ptBR})} – ${format(weekDays[weekDays.length-1],"d 'de' MMMM yyyy",{locale:ptBR})}`
              : format(selectedDay,"EEEE, d 'de' MMMM",{locale:ptBR})}
          </h1>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-sand/40 rounded-xl px-3 py-2">
            <CalendarDays className="w-4 h-4 text-forest-500" strokeWidth={1.5} />
            <div><p className="text-xs text-forest-500 leading-none">Hoje</p><p className="text-lg font-semibold text-forest leading-tight">{agendadosHoje}</p></div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-sand/40 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-forest-500" strokeWidth={1.5} />
            <div><p className="text-xs text-forest-500 leading-none">Semana</p><p className="text-lg font-semibold text-forest leading-tight">{agsFiltrados.length}</p></div>
          </div>
        </div>
      </div>

      {/* Tabs de sala */}
      <div className="flex gap-1 p-1 bg-sand/20 rounded-xl w-fit">
        {salas.map(s => {
          const isOnline = s.nome.toLowerCase().includes("online");
          return (
            <button
              key={s.id}
              onClick={() => setFiltroSalaId(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroSalaId === s.id ? "bg-white text-forest shadow-sm" : "text-forest-500 hover:text-forest hover:bg-white/50"}`}
            >
              {isOnline ? <Monitor className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
              {s.nome}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={()=>navSemana(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={irParaHoje} className={`px-3 h-8 text-sm rounded-lg border transition-colors ${isCurrentWeek&&viewMode==="dia"&&format(selectedDay,"yyyy-MM-dd")===hoje?"bg-forest text-cream border-forest":"border-sand/40 hover:bg-sand/20 text-forest"}`}>Hoje</button>
        <button onClick={()=>navSemana(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"><ChevronRight className="w-4 h-4" /></button>
        <div className="relative">
          <button
            onClick={() => datePickerRef.current?.showPicker?.() ?? datePickerRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest"
            title="Ir para data"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          <input
            ref={datePickerRef}
            type="date"
            className="absolute opacity-0 pointer-events-none w-0 h-0 top-0 left-0"
            onChange={e => {
              if (!e.target.value) return;
              const [py, pm, pd] = e.target.value.split("-").map(Number);
              const picked = new Date(py, pm - 1, pd);
              const ws = startOfWeek(picked, { weekStartsOn: 1 });
              router.push(`/dashboard?semana=${format(ws, "yyyy-MM-dd")}`);
            }}
          />
        </div>
        <div className="flex-1" />
        <div className="flex rounded-lg border border-sand/40 overflow-hidden text-sm">
          {(["dia","semana"] as const).map(mode=>(
            <button key={mode} onClick={()=>setViewMode(mode)} className={`px-3 h-8 flex items-center gap-1.5 transition-colors border-r border-sand/40 last:border-r-0 ${viewMode===mode?"bg-forest text-cream":"hover:bg-sand/20 text-forest"}`}>
              {mode==="dia"?<AlignLeft className="w-3.5 h-3.5"/>:<LayoutGrid className="w-3.5 h-3.5"/>}
              {mode==="dia"?"Dia":"Semana"}
            </button>
          ))}
        </div>
        <select value={filtroProf} onChange={e=>setFiltroProf(e.target.value)} className="h-8 text-sm border border-sand/40 rounded-lg px-2 bg-white text-forest focus:outline-none focus:ring-2 focus:ring-forest/20">
          <option value="todos">Todos os profissionais</option>
          {profissionais.map(p=><option key={p.id} value={p.id}>{p.profile?.nome_completo??p.id}</option>)}
        </select>
        <Link href={`/agenda/novo${filtroSalaId ? `?sala_id=${filtroSalaId}` : ""}`} className="btn-primary h-8 flex items-center gap-1.5 text-sm px-3">
          <Plus className="w-4 h-4" /> Novo agendamento
        </Link>
      </div>

      {/* Grid */}
      <div
        className="rounded-xl border border-sand/30 bg-white overflow-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {viewMode==="semana" ? (
          <div className="flex min-w-[600px]">
            <div className="w-14 shrink-0 border-r border-gray-100">
              <div className="h-10 border-b border-gray-100" />
              {horas.map(h=>(
                <div key={h} className="relative" style={{height:PX_POR_HORA}}>
                  <span className="absolute -top-2.5 left-1 text-[11px] text-gray-400">{String(h).padStart(2,"0")}:00</span>
                </div>
              ))}
            </div>
            {weekDays.map((dia,i)=>{
              const isHoje = format(dia,"yyyy-MM-dd")===hoje;
              const agsDay = agsParaDia(dia);
              const ativos = agsDay.filter(a=>["agendado","confirmado"].includes(a.status)).length;
              return (
                <div key={i} className="flex-1 min-w-0 border-r border-gray-100 last:border-r-0 flex flex-col">
                  <div className={`h-10 border-b border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${isHoje?"bg-forest/5":""}`} onClick={()=>{setSelectedDay(dia);setViewMode("dia");}}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide capitalize">{format(dia,"EEE",{locale:ptBR})}</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-semibold ${isHoje?"text-forest":"text-gray-700"}`}>{format(dia,"d")}</span>
                      {ativos>0&&<span className="text-[10px] bg-forest/10 text-forest rounded-full px-1 leading-4">{ativos}</span>}
                    </div>
                  </div>
                  <div className="relative px-0.5">
                    <DiaColuna dia={dia} ags={agsDay} horariosParaDia={horariosParaDia(dia)} mostrarHorarios={filtroProf!=="todos"} profColorMap={profColorMap} profHexMap={profHexMap} onEdit={setEditingAg} onDelete={handleDelete} onStatus={handleStatus} onResizeStart={handleResizeStart} pending={isPending} canEdit={canEdit} salaId={filtroSalaId} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista dia: seletor de dia (seg-sáb) + coluna única */
          <div>
            <div className="flex border-b border-gray-100 overflow-x-auto">
              <div className="w-14 shrink-0 border-r border-gray-100" />
              {weekDays.map((dia,i)=>{
                const isSel=isSameDay(dia,selectedDay), isHoje=format(dia,"yyyy-MM-dd")===hoje;
                return (
                  <button key={i} onClick={()=>setSelectedDay(dia)} className={`flex-1 min-w-[60px] py-2 flex flex-col items-center border-r border-gray-100 last:border-r-0 transition-colors ${isSel?"bg-forest/5":"hover:bg-gray-50"}`}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide capitalize">{format(dia,"EEE",{locale:ptBR})}</span>
                    <span className={`text-sm font-semibold ${isHoje?"text-forest":"text-gray-700"} ${isSel?"underline decoration-2 underline-offset-2 decoration-forest":""}`}>{format(dia,"d")}</span>
                  </button>
                );
              })}
            </div>

            {/* Grid do dia selecionado */}
            <div className="flex min-w-0">
              <div className="w-14 shrink-0 border-r border-gray-100">
                {horas.map(h=>(
                  <div key={h} className="relative" style={{height:PX_POR_HORA}}>
                    <span className="absolute -top-2.5 left-1 text-[11px] text-gray-400">{String(h).padStart(2,"0")}:00</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 px-1">
                <DiaColuna
                  dia={selectedDay}
                  ags={agsParaDia(selectedDay)}
                  horariosParaDia={horariosParaDia(selectedDay)}
                  mostrarHorarios={filtroProf!=="todos"}
                  profColorMap={profColorMap}
                  profHexMap={profHexMap}
                  onEdit={setEditingAg}
                  onDelete={handleDelete}
                  onStatus={handleStatus}
                  onResizeStart={handleResizeStart}
                  pending={isPending}
                  canEdit={canEdit}
                  salaId={filtroSalaId}
                />
              </div>
            </div>

            {/* Resumo do dia */}
            <div className="border-t border-gray-100 p-4">
              <p className="text-xs font-medium text-forest-500 uppercase tracking-wider mb-3">
                Resumo — {agsParaDia(selectedDay).length} atendimento(s)
                {salaAtual && <span className="ml-2 font-normal normal-case text-forest-400">· {salaAtual.nome}</span>}
              </p>
              {filtroProf!=="todos" && horariosParaDia(selectedDay).length>0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {horariosParaDia(selectedDay).map((h,i)=>(
                    <span key={i} className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-800 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Disponível: {h.hora_inicio.slice(0,5)} – {h.hora_fim.slice(0,5)}
                    </span>
                  ))}
                </div>
              )}
              {agsParaDia(selectedDay).length===0 ? (
                <p className="text-sm text-forest-400">Nenhum agendamento para este dia.</p>
              ) : (
                <div className="space-y-2">
                  {agsParaDia(selectedDay)
                    .sort((a,b)=>new Date(a.data_hora_inicio).getTime()-new Date(b.data_hora_inicio).getTime())
                    .map(ag=>{
                      const cfg=STATUS[ag.status]??STATUS.agendado;
                      const profIdx=profissionais.findIndex(p=>p.id===ag.profissional?.id);
                      return (
                        <div key={ag.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={()=>canEdit&&setEditingAg(ag)}>
                          <div className={`w-1.5 h-8 rounded-full ${profBgMap.get(ag.profissional?.id ?? "") ?? BG_PROF[0]} shrink-0`} />
                          <div className="w-16 text-center shrink-0">
                            <p className="text-sm font-semibold text-forest">{format(new Date(ag.data_hora_inicio),"HH:mm")}</p>
                            <p className="text-xs text-forest-400">{format(new Date(ag.data_hora_fim),"HH:mm")}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-forest truncate">{ag.paciente?.nome_completo??"—"}</p>
                            <p className="text-xs text-forest-500 truncate">
                              {ag.profissional?.profile?.nome_completo}{ag.sala?` · ${ag.sala.nome}`:""}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.badge}`}>{cfg.label}</span>
                          {canEdit&&<Pencil className="w-3.5 h-3.5 text-forest-400 shrink-0"/>}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS).map(([key,cfg])=>(
            <span key={key} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-600">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
          ))}
        </div>
        {filtroProf!=="todos"&&(
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border bg-green-50 border-green-200 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-400" /> Horário disponível
          </span>
        )}
      </div>

      {/* Modal de edição */}
      {editingAg && (
        <EditModal
          ag={editingAg}
          profissionais={profissionais}
          pacientes={pacientes}
          salas={salas}
          onClose={()=>setEditingAg(null)}
          onSaved={()=>router.refresh()}
        />
      )}
    </div>
  );
}
