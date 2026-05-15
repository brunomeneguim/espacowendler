"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  startOfWeek, addWeeks, subWeeks, addDays, addMonths, addYears,
  format, isToday, getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2, Pencil, X,
  CalendarRange, MoreHorizontal, Share2, Users, Repeat2,
} from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  criarPlanner, renomearPlanner, excluirPlanner,
  criarTarefaPlanner, editarTarefaPlanner, alternarTarefaPlanner, excluirTarefaPlanner,
  buscarCompartilhamentos, salvarCompartilhamentos, removerCompartilhamento,
  criarTarefasRepetidas,
} from "./actions";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Planner {
  id: string;
  nome: string;
  owner_profile_id: string | null;
  profissional_id: string | null;
  ordem: number;
  criado_em: string;
}

interface PlannerTarefa {
  id: string;
  planner_id: string;
  titulo: string;
  descricao: string | null;
  data_tarefa: string;
  concluida: boolean;
  concluida_em: string | null;
  criado_em: string;
}

interface Profile {
  id: string;
  nome_completo: string;
  role: string;
  email: string;
}

interface Props {
  planners: Planner[];
  tarefas: PlannerTarefa[];
  todosProfiles: Profile[];
  compartilhadosMap: Record<string, string[]>;
  currentUserId: string;
}

const DIAS_ABREV = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// ── Helper: texto com links clicáveis ─────────────────────────────────────────
function renderWithLinks(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="underline text-blue-500 hover:text-blue-700 break-all">
        {part}
      </a>
    ) : part
  );
}

// ── Tipos de repetição ────────────────────────────────────────────────────────
type RepeatMode = "daily" | "weekly" | "monthly" | "yearly" | "weekdays" | "custom";
type EndType = "never" | "count" | "date";
type CustomUnit = "days" | "weeks" | "months" | "years";

const DIAS_SEMANA_FULL = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const MESES_PT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const UNIT_LABELS: Record<CustomUnit, string> = { days:"Dia(s)", weeks:"Semana(s)", months:"Mês/Meses", years:"Ano(s)" };
// JS days em ordem Seg→Dom: [1,2,3,4,5,6,0]
const WEEK_ORDER = [1,2,3,4,5,6,0];
const WEEK_LABELS = ["Se","Te","Qa","Qi","Sx","Sb","Do"];

function generateRepeatDates(
  base: Date,
  mode: RepeatMode,
  interval: number,
  unit: CustomUnit,
  weekDays: number[],
  endType: EndType,
  endDateStr: string,
  endCount: number,
): string[] {
  const MAX = 52;
  const baseStr = format(base, "yyyy-MM-dd");
  const endDateObj = endDateStr ? new Date(endDateStr + "T23:59:59") : null;
  const results: string[] = [];

  const canAdd = (d: Date): boolean => {
    if (format(d, "yyyy-MM-dd") <= baseStr) return false;
    if (endType === "date" && endDateObj && d > endDateObj) return false;
    if (endType === "count" && results.length >= endCount) return false;
    if (results.length >= MAX) return false;
    return true;
  };
  const isDone = (d: Date): boolean => {
    if (results.length >= MAX) return true;
    if (endType === "count" && results.length >= endCount) return true;
    if (endType === "date" && endDateObj && d > endDateObj) return true;
    if (endType === "never" && results.length >= MAX) return true;
    return false;
  };

  let d: Date;
  if (mode === "daily") {
    d = addDays(base, 1);
    while (!isDone(d)) { if (canAdd(d)) results.push(format(d, "yyyy-MM-dd")); d = addDays(d, 1); }
  } else if (mode === "weekly") {
    d = addDays(base, 7);
    while (!isDone(d)) { if (canAdd(d)) results.push(format(d, "yyyy-MM-dd")); d = addDays(d, 7); }
  } else if (mode === "monthly") {
    d = addMonths(base, 1);
    while (!isDone(d)) { if (canAdd(d)) results.push(format(d, "yyyy-MM-dd")); d = addMonths(d, 1); }
  } else if (mode === "yearly") {
    d = addYears(base, 1);
    while (!isDone(d)) { if (canAdd(d)) results.push(format(d, "yyyy-MM-dd")); d = addYears(d, 1); }
  } else if (mode === "weekdays") {
    d = addDays(base, 1);
    while (!isDone(d)) {
      const day = getDay(d);
      if (day >= 1 && day <= 5 && canAdd(d)) results.push(format(d, "yyyy-MM-dd"));
      d = addDays(d, 1);
    }
  } else if (mode === "custom") {
    if (unit === "days") {
      d = addDays(base, interval);
      while (!isDone(d)) { if (canAdd(d)) results.push(format(d, "yyyy-MM-dd")); d = addDays(d, interval); }
    } else if (unit === "weeks" && weekDays.length > 0) {
      const baseMonday = startOfWeek(base, { weekStartsOn: 1 });
      d = addDays(base, 1);
      while (!isDone(d)) {
        const jsDay = getDay(d);
        if (weekDays.includes(jsDay)) {
          const wDiff = Math.round((startOfWeek(d, { weekStartsOn: 1 }).getTime() - baseMonday.getTime()) / 604800000);
          if (wDiff % interval === 0 && canAdd(d)) results.push(format(d, "yyyy-MM-dd"));
        }
        d = addDays(d, 1);
      }
    } else if (unit === "months") {
      d = addMonths(base, interval);
      while (!isDone(d)) { if (canAdd(d)) results.push(format(d, "yyyy-MM-dd")); d = addMonths(d, interval); }
    } else if (unit === "years") {
      d = addYears(base, interval);
      while (!isDone(d)) { if (canAdd(d)) results.push(format(d, "yyyy-MM-dd")); d = addYears(d, interval); }
    }
  }
  return results;
}

// ── Modal Repetir Tarefa ──────────────────────────────────────────────────────
function ModalRepetirTarefa({ tarefa, onClose, onConfirm }: {
  tarefa: PlannerTarefa;
  onClose: () => void;
  onConfirm: (dates: string[]) => void;
}) {
  const base = new Date(tarefa.data_tarefa + "T12:00:00");
  const jsDay = getDay(base);

  const [mode, setMode] = useState<RepeatMode>("weekly");
  const [customInterval, setCustomInterval] = useState(1);
  const [unit, setUnit] = useState<CustomUnit>("weeks");
  const [weekDays, setWeekDays] = useState<number[]>([jsDay]);
  const [endType, setEndType] = useState<EndType>("count");
  const [endDate, setEndDate] = useState(format(addMonths(base, 1), "yyyy-MM-dd"));
  const [endCount, setEndCount] = useState(4);

  const dates = useMemo(() =>
    generateRepeatDates(base, mode, customInterval, unit, weekDays, endType, endDate, endCount),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [mode, customInterval, unit, weekDays, endType, endDate, endCount]);

  function toggleWeekDay(day: number) {
    setWeekDays(prev => prev.includes(day)
      ? prev.length > 1 ? prev.filter(d => d !== day) : prev
      : [...prev, day]
    );
  }

  const modeOptions: [RepeatMode, string][] = [
    ["daily", "Todo dia"],
    ["weekly", `Toda semana na ${DIAS_SEMANA_FULL[jsDay]}`],
    ["monthly", `Todo mês no dia ${format(base, "d")}`],
    ["yearly", `Todo ano em ${format(base, "d")} de ${MESES_PT[base.getMonth()]}`],
    ["weekdays", "Todo dia útil (Seg a Sex)"],
    ["custom", "Personalizado"],
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sand/30 shrink-0">
            <div className="flex items-center gap-2">
              <Repeat2 className="w-4 h-4 text-forest-400" />
              <h2 className="font-display text-lg text-forest">Repetir tarefa</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand/20 text-forest-400"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Preview da tarefa */}
            <div className="bg-forest/5 rounded-xl px-3 py-2">
              <p className="text-xl font-bakerie font-semibold text-forest truncate">{tarefa.titulo}</p>
              {tarefa.descricao && <p className="text-xl font-bakerie text-forest-400 truncate">{tarefa.descricao}</p>}
            </div>

            {/* Modo */}
            <div>
              <p className="text-[10px] font-semibold text-forest-400 uppercase tracking-widest mb-2">Modo de repetição</p>
              <div className="space-y-0.5">
                {modeOptions.map(([val, label]) => (
                  <label key={val} onClick={() => setMode(val)} className="flex items-center gap-3 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-forest/5 transition-colors">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${mode === val ? "border-forest bg-forest" : "border-forest/30 group-hover:border-forest/60"}`}>
                      {mode === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm text-forest">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Opções personalizadas */}
            {mode === "custom" && (
              <div className="bg-forest/5 rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-forest-400 shrink-0">A cada</span>
                  <input type="number" min={1} max={99} value={customInterval}
                    onChange={e => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 text-sm text-center border border-forest/20 rounded-lg px-2 py-1 outline-none focus:border-forest/50 text-forest bg-white" />
                  <select value={unit} onChange={e => setUnit(e.target.value as CustomUnit)}
                    className="flex-1 text-sm border border-forest/20 rounded-lg px-2 py-1 outline-none focus:border-forest/50 text-forest bg-white">
                    {(["days","weeks","months","years"] as CustomUnit[]).map(u => (
                      <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
                {unit === "weeks" && (
                  <div>
                    <p className="text-[10px] text-forest-400 mb-1.5 uppercase tracking-widest">Repetir nos dias</p>
                    <div className="flex gap-1">
                      {WEEK_ORDER.map((jsD, i) => (
                        <button key={jsD} onClick={() => toggleWeekDay(jsD)}
                          className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${weekDays.includes(jsD) ? "bg-forest text-cream" : "bg-forest/10 text-forest hover:bg-forest/20"}`}>
                          {WEEK_LABELS[i]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Encerramento */}
            <div>
              <p className="text-[10px] font-semibold text-forest-400 uppercase tracking-widest mb-2">Encerramento</p>
              <div className="space-y-0.5">
                <label onClick={() => setEndType("never")} className="flex items-center gap-3 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-forest/5 transition-colors">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${endType === "never" ? "border-forest bg-forest" : "border-forest/30 group-hover:border-forest/60"}`}>
                    {endType === "never" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-forest">Nunca (máx. 52 ocorrências)</span>
                </label>

                <div onClick={() => setEndType("count")} className="flex items-center gap-3 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-forest/5 transition-colors">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${endType === "count" ? "border-forest bg-forest" : "border-forest/30 group-hover:border-forest/60"}`}>
                    {endType === "count" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-forest">Após</span>
                    <input type="number" min={1} max={365} value={endCount}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { setEndType("count"); setEndCount(Math.max(1, parseInt(e.target.value) || 1)); }}
                      className="w-16 text-sm text-center border border-forest/20 rounded-lg px-2 py-1 outline-none focus:border-forest/50 text-forest bg-white" />
                    <span className="text-sm text-forest">ocorrências</span>
                  </div>
                </div>

                <div onClick={() => setEndType("date")} className="flex items-center gap-3 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-forest/5 transition-colors">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${endType === "date" ? "border-forest bg-forest" : "border-forest/30 group-hover:border-forest/60"}`}>
                    {endType === "date" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-forest">Em</span>
                    <input type="date" value={endDate} min={format(addDays(base, 1), "yyyy-MM-dd")}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { setEndType("date"); setEndDate(e.target.value); }}
                      className="text-sm border border-forest/20 rounded-lg px-2 py-1 outline-none focus:border-forest/50 text-forest bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-sand/20 shrink-0 space-y-3">
            <p className="text-xs text-center text-forest-400">
              {dates.length === 0
                ? "Nenhuma ocorrência gerada com estas configurações"
                : <><span className="font-semibold text-forest">{dates.length}</span> tarefa{dates.length !== 1 ? "s" : ""} serão criadas</>
              }
            </p>
            <div className="flex gap-3">
              <button onClick={() => dates.length > 0 && onConfirm(dates)} disabled={dates.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                <Repeat2 className="w-4 h-4" /> Criar tarefas
              </button>
              <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  profissional: "Profissional",
  secretaria: "Secretaria",
};

// ── Hook: fechar ao clicar fora ───────────────────────────────────────────────
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ── Modal Compartilhar ────────────────────────────────────────────────────────
function ModalCompartilhar({
  planner,
  todosProfiles,
  currentUserId,
  onClose,
}: {
  planner: Planner;
  todosProfiles: Profile[];
  currentUserId: string;
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    buscarCompartilhamentos(planner.id).then(({ data }) => {
      setSelecionados(new Set(data));
      setCarregando(false);
    });
  }, [planner.id]);

  const perfilsFiltrados = useMemo(() =>
    todosProfiles
      .filter(p => p.id !== currentUserId) // exclui o próprio usuário
      .filter(p =>
        p.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
        p.email.toLowerCase().includes(busca.toLowerCase())
      ),
    [todosProfiles, currentUserId, busca],
  );

  function toggle(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleSalvar() {
    setSalvando(true);
    setErro(null);
    startTransition(async () => {
      const res = await salvarCompartilhamentos(planner.id, Array.from(selecionados));
      setSalvando(false);
      if (res.error) setErro(res.error);
      else onClose();
    });
  }

  function iniciais(nome: string) {
    return nome.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sand/30 shrink-0">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-forest-400" />
              <h2 className="font-display text-lg text-forest">Compartilhar</h2>
              <span className="text-base text-forest-400 font-bakerie">· {planner.nome}</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand/20 text-forest-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Busca */}
          <div className="px-6 py-3 border-b border-sand/20 shrink-0">
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar usuário…"
              className="w-full text-sm border border-sand/40 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest text-forest"
            />
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {carregando ? (
              <div className="flex justify-center py-8">
                <span className="w-5 h-5 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
              </div>
            ) : perfilsFiltrados.length === 0 ? (
              <p className="text-sm text-forest-400 text-center py-6">Nenhum usuário encontrado.</p>
            ) : (
              perfilsFiltrados.map(p => {
                const ativo = selecionados.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors ${
                      ativo ? "bg-forest/8" : "hover:bg-sand/20"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                      ativo ? "bg-forest text-cream" : "bg-forest/10 text-forest"
                    }`}>
                      {iniciais(p.nome_completo)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-forest truncate">{p.nome_completo}</p>
                      <p className="text-xs text-forest-400 truncate">{ROLE_LABELS[p.role] ?? p.role}</p>
                    </div>
                    {/* Check */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      ativo ? "bg-forest border-forest text-white" : "border-forest/30"
                    }`}>
                      {ativo && <Check className="w-3 h-3" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé */}
          <div className="px-6 py-4 border-t border-sand/20 shrink-0 space-y-2">
            {selecionados.size > 0 && (
              <p className="text-xs text-forest-400 text-center">
                Compartilhando com <span className="font-semibold text-forest">{selecionados.size}</span> usuário{selecionados.size !== 1 ? "s" : ""}
              </p>
            )}
            <ErrorBanner message={erro} />
            <div className="flex gap-3">
              <button
                onClick={handleSalvar}
                disabled={salvando || carregando}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {salvando
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Check className="w-4 h-4" />}
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Componente de tarefa ──────────────────────────────────────────────────────
function TarefaItem({
  tarefa, onToggle, onEdit, onDelete, onRepeat, canDelete, pending,
}: {
  tarefa: PlannerTarefa;
  onToggle: () => void;
  onEdit: (titulo: string, descricao: string) => void;
  onDelete: () => void;
  onRepeat: () => void;
  canDelete: boolean;
  pending: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [descricao, setDescricao] = useState(tarefa.descricao ?? "");
  const tituloRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editando) tituloRef.current?.focus(); }, [editando]);

  useEffect(() => {
    if (!editando) { setTitulo(tarefa.titulo); setDescricao(tarefa.descricao ?? ""); }
  }, [tarefa.titulo, tarefa.descricao, editando]);

  function handleEditSave() {
    if (titulo.trim()) onEdit(titulo.trim(), descricao.trim());
    else { setTitulo(tarefa.titulo); setDescricao(tarefa.descricao ?? ""); }
    setEditando(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleEditSave();
    if (e.key === "Escape") { setTitulo(tarefa.titulo); setDescricao(tarefa.descricao ?? ""); setEditando(false); }
  }

  const textoColor = tarefa.concluida
    ? "text-red-400/70 hover:text-red-500/70"
    : "text-forest hover:text-forest/70";

  return (
    <div
      draggable={!pending && !editando}
      onDragStart={e => { e.dataTransfer.setData("tarefaId", tarefa.id); e.dataTransfer.effectAllowed = "copy"; }}
      className={`group flex items-start gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
        pending ? "opacity-40 pointer-events-none" : "hover:bg-forest/5"
      } ${!pending && !editando ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        className={`w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          tarefa.concluida ? "bg-red-400 border-red-400 text-white" : "border-forest-300 hover:border-forest"
        }`}
      >
        {tarefa.concluida && <Check className="w-2 h-2" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0 relative">
        {tarefa.concluida && !editando && (
          <span aria-hidden style={{
            position: "absolute", left: 0, right: 0, top: "50%",
            transform: "translateY(-50%)", height: 8,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='8'%3E%3Cpath d='M0%2C4 Q5%2C0 10%2C4 Q15%2C8 20%2C4' fill='none' stroke='%23f87171' stroke-width='1.5'/%3E%3C%2Fsvg%3E")`,
            backgroundRepeat: "repeat-x", backgroundPosition: "left center",
            pointerEvents: "none", zIndex: 1,
          }} />
        )}

        {editando ? (
          <div
            className="flex flex-col gap-1"
            onBlur={e => {
              // Só salva se o foco saiu totalmente do container (não passou para o outro input)
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                handleEditSave();
              }
            }}
          >
            <input ref={tituloRef} value={titulo} onChange={e => setTitulo(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Título"
              className="w-full text-xs font-semibold text-forest bg-white border border-forest/30 rounded px-1.5 py-0.5 outline-none focus:border-forest/60" />
            <input value={descricao} onChange={e => setDescricao(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Descrição (opcional)"
              className="w-full text-xs text-forest bg-white border border-forest/30 rounded px-1.5 py-0.5 outline-none focus:border-forest/60" />
          </div>
        ) : (
          <div onClick={onToggle} onDoubleClick={e => { e.stopPropagation(); setEditando(true); }}
            className={`cursor-pointer select-none ${textoColor} transition-colors`}>
            <p className="text-xl font-bakerie font-semibold leading-tight break-words">{renderWithLinks(tarefa.titulo)}</p>
            {tarefa.descricao && (
              <p className="text-xl font-bakerie leading-snug break-words mt-0.5 opacity-80">{renderWithLinks(tarefa.descricao)}</p>
            )}
          </div>
        )}
      </div>

      {!editando && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity mt-0.5">
          <button onClick={() => setEditando(true)} title="Editar" className="p-0.5 rounded hover:bg-forest/10 text-forest-400 hover:text-forest">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onRepeat} title="Repetir tarefa" className="p-0.5 rounded hover:bg-forest/10 text-forest-400 hover:text-forest">
            <Repeat2 className="w-3 h-3" />
          </button>
          {canDelete && (
            <button onClick={onDelete} title="Excluir" className="p-0.5 rounded hover:bg-rust/10 text-forest-400 hover:text-rust">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Célula do dia ─────────────────────────────────────────────────────────────
function DiaCell({
  date, tarefas, plannerId, isOwner, onAddTarefa, onToggleTarefa, onEditTarefa, onDeleteTarefa, onRepeatTarefa, pendingId,
}: {
  date: Date; tarefas: PlannerTarefa[]; plannerId: string; isOwner: boolean;
  onAddTarefa: (titulo: string, data: string, descricao: string) => void;
  onToggleTarefa: (id: string, concluida: boolean) => void;
  onEditTarefa: (id: string, titulo: string, descricao: string) => void;
  onDeleteTarefa: (id: string) => void;
  onRepeatTarefa: (tarefa: PlannerTarefa) => void;
  pendingId: string | null;
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const tituloRef = useRef<HTMLInputElement>(null);
  const hoje = isToday(date);
  const dataStr = format(date, "yyyy-MM-dd");

  const tarefasDoDia = tarefas
    .filter(t => t.planner_id === plannerId && t.data_tarefa === dataStr)
    .sort((a, b) => a.criado_em > b.criado_em ? 1 : -1);

  useEffect(() => { if (adicionando) tituloRef.current?.focus(); }, [adicionando]);

  function handleAdd() {
    if (novoTitulo.trim()) {
      onAddTarefa(novoTitulo.trim(), dataStr, novaDescricao.trim());
      setNovoTitulo(""); setNovaDescricao("");
      tituloRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setAdicionando(false); setNovoTitulo(""); setNovaDescricao(""); }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false);
    const tarefaId = e.dataTransfer.getData("tarefaId");
    if (!tarefaId) return;
    const origem = tarefas.find(t => t.id === tarefaId);
    if (!origem || origem.data_tarefa === dataStr) return;
    onAddTarefa(origem.titulo, dataStr, origem.descricao ?? "");
  }

  return (
    <div
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      className={`flex flex-col min-h-[180px] border-r border-sand/30 last:border-r-0 transition-colors ${
        isDragOver ? "bg-forest/[0.06] ring-1 ring-inset ring-forest/20" : hoje ? "bg-forest/[0.03]" : ""
      }`}
    >
      <div className={`px-2 py-2 border-b border-sand/30 text-center sticky top-0 bg-white z-10 ${hoje ? "bg-peach/10" : ""}`}>
        <p className={`text-[10px] uppercase tracking-wider font-medium ${hoje ? "text-forest" : "text-forest-400"}`}>
          {DIAS_ABREV[date.getDay() === 0 ? 6 : date.getDay() - 1]}
        </p>
        <p className={`text-lg font-display leading-tight ${
          hoje ? "text-white bg-forest rounded-full w-7 h-7 flex items-center justify-center mx-auto mt-0.5" : "text-forest"
        }`}>
          {format(date, "d")}
        </p>
      </div>

      <div className="flex-1 py-1 overflow-y-auto">
        {tarefasDoDia.map(t => (
          <TarefaItem key={t.id} tarefa={t}
            onToggle={() => onToggleTarefa(t.id, !t.concluida)}
            onEdit={(titulo, desc) => onEditTarefa(t.id, titulo, desc)}
            onDelete={() => onDeleteTarefa(t.id)}
            onRepeat={() => onRepeatTarefa(t)}
            canDelete={isOwner}
            pending={pendingId === t.id || t.id.startsWith("temp-")} />
        ))}
      </div>

      <div className="px-1 pb-1.5">
        {adicionando ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <input ref={tituloRef} value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (!novoTitulo.trim() && !novaDescricao.trim()) setAdicionando(false); }}
                placeholder="Título…"
                className="flex-1 text-xs font-semibold text-forest bg-white border border-forest/30 rounded px-1.5 py-1 outline-none focus:border-forest/60 min-w-0" />
              <button onMouseDown={e => e.preventDefault()} onClick={handleAdd}
                disabled={!novoTitulo.trim()}
                className="p-1 rounded bg-forest text-cream disabled:opacity-40 hover:bg-forest/80 transition-colors shrink-0">
                <Check className="w-3 h-3" />
              </button>
              <button onMouseDown={e => e.preventDefault()}
                onClick={() => { setAdicionando(false); setNovoTitulo(""); setNovaDescricao(""); }}
                className="p-1 rounded hover:bg-sand/30 text-forest-400 shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
            <input value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Descrição (opcional)…"
              className="text-xs text-forest bg-white border border-forest/30 rounded px-1.5 py-1 outline-none focus:border-forest/60 w-full" />
          </div>
        ) : (
          <button onClick={() => setAdicionando(true)}
            className="w-full flex items-center gap-1 px-1.5 py-1 rounded-lg text-forest-300 hover:text-forest hover:bg-forest/5 transition-colors group">
            <Plus className="w-3 h-3 group-hover:text-forest" />
            <span className="text-[10px]">Adicionar</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Aba do planner ─────────────────────────────────────────────────────────────
function PlannerTab({
  planner, active, isOwner, sharedNames, onClick, onRename, onDelete, onShare, onRemoveShare, onRemoveAllShares,
}: {
  planner: Planner; active: boolean; isOwner: boolean;
  sharedNames: string[];
  onClick: () => void;
  onRename: (nome: string) => void;
  onDelete: () => void;
  onShare: () => void;
  onRemoveShare: () => void;
  onRemoveAllShares: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(planner.nome);
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ bottom: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shareIconRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => { setMenuAberto(false); setMenuPos(null); });

  useEffect(() => { if (editando) inputRef.current?.select(); }, [editando]);

  useEffect(() => {
    if (!menuAberto) return;
    const close = () => { setMenuAberto(false); setMenuPos(null); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [menuAberto]);

  function handleRename() {
    if (nome.trim() && nome.trim() !== planner.nome) onRename(nome.trim());
    else setNome(planner.nome);
    setEditando(false);
  }

  function handleOpenMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (menuAberto) { setMenuAberto(false); setMenuPos(null); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ bottom: window.innerHeight - rect.top + 4, left: rect.right - 160 });
    setMenuAberto(true);
  }

  return (
    <div className="relative group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all" onClick={onClick}>
      {/* Ícone de compartilhamento com tooltip fixo */}
      {sharedNames.length > 0 && (
        <div
          ref={shareIconRef}
          className="shrink-0"
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => {
            const rect = shareIconRef.current?.getBoundingClientRect();
            if (rect) setTooltipPos({
              bottom: window.innerHeight - rect.top + 8,
              left: rect.left + rect.width / 2,
            });
          }}
          onMouseLeave={() => setTooltipPos(null)}
        >
          <Users className="w-3 h-3 text-forest-400 hover:text-forest transition-colors cursor-default" strokeWidth={1.5} />
        </div>
      )}
      {/* Tooltip fixo (fora de qualquer overflow) */}
      {tooltipPos && sharedNames.length > 0 && (
        <div
          className="pointer-events-none z-[9999]"
          style={{ position: "fixed", bottom: tooltipPos.bottom, left: tooltipPos.left, transform: "translateX(-50%)" }}
        >
          <div className="bg-forest text-cream text-xs rounded-xl px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="font-semibold mb-1 opacity-70 uppercase tracking-wide text-[10px]">
              {isOwner ? "Compartilhado com" : "Compartilhado por"}
            </p>
            {sharedNames.map(name => (
              <p key={name} className="leading-snug">{name}</p>
            ))}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-forest" />
        </div>
      )}

      {editando ? (
        <input ref={inputRef} value={nome} onChange={e => setNome(e.target.value)}
          onBlur={handleRename}
          onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setNome(planner.nome); setEditando(false); } }}
          onClick={e => e.stopPropagation()}
          className="min-w-0 w-32 text-xl font-bakerie bg-transparent border-b border-forest/40 outline-none text-forest" autoFocus />
      ) : (
        <span
          className={`text-xl font-bakerie whitespace-nowrap transition-colors ${active ? "text-forest font-semibold" : "text-forest-400 hover:text-forest"}`}
          onDoubleClick={e => { if (!isOwner) return; e.stopPropagation(); setEditando(true); }}
        >
          {planner.nome}
        </span>
      )}

      {!editando && (
        <button ref={btnRef} onClick={handleOpenMenu}
          className={`p-0.5 rounded hover:bg-forest/10 transition-opacity text-forest-400 hover:text-forest ${menuAberto ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}

      {menuAberto && menuPos && (
        <div ref={menuRef}
          style={{ position: "fixed", bottom: menuPos.bottom, left: menuPos.left }}
          className="bg-white border border-sand/40 rounded-xl shadow-lg py-1 z-[200] min-w-[160px]">
          {isOwner && (
            <>
              <button onClick={e => { e.stopPropagation(); setMenuAberto(false); setMenuPos(null); setEditando(true); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forest hover:bg-sand/20">
                <Pencil className="w-3.5 h-3.5" /> Renomear
              </button>
              <button onClick={e => { e.stopPropagation(); setMenuAberto(false); setMenuPos(null); onShare(); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forest hover:bg-sand/20">
                <Share2 className="w-3.5 h-3.5" /> Compartilhar
              </button>
              {sharedNames.length > 0 && (
                <button onClick={e => { e.stopPropagation(); setMenuAberto(false); setMenuPos(null); onRemoveAllShares(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rust hover:bg-rust/10">
                  <X className="w-3.5 h-3.5" /> Remover compartilhamento
                </button>
              )}
              <div className="my-1 border-t border-sand/30" />
              <button onClick={e => { e.stopPropagation(); setMenuAberto(false); setMenuPos(null); onDelete(); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rust hover:bg-rust/10">
                <Trash2 className="w-3.5 h-3.5" /> Excluir planner
              </button>
            </>
          )}
          {!isOwner && (
            <button onClick={e => { e.stopPropagation(); setMenuAberto(false); setMenuPos(null); onRemoveShare(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-rust hover:bg-rust/10">
              <X className="w-3.5 h-3.5" /> Remover compartilhamento
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal de criar planner ─────────────────────────────────────────────────────
function ModalCriarPlanner({
  existingNames, onConfirm, onClose, isPending,
}: {
  existingNames: string[]; onConfirm: (nome: string) => void;
  onClose: () => void; isPending: boolean;
}) {
  const [nome, setNome] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) { setErroLocal("Digite um nome para o planner."); return; }
    const duplicado = existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase());
    if (duplicado) { setErroLocal(`Já existe um planner com o nome "${trimmed}".`); return; }
    setErroLocal(null);
    onConfirm(trimmed);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-sand/30">
            <h2 className="font-display text-lg text-forest">Novo planner</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand/20 text-forest-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="label">Digite o nome do Planner <span className="text-rust">*</span></label>
              <input ref={inputRef} value={nome}
                onChange={e => { setNome(e.target.value); setErroLocal(null); }}
                onKeyDown={e => { if (e.key === "Escape") onClose(); }}
                placeholder="Ex: Semana clínica, Projetos…"
                className={`input-field ${erroLocal ? "border-rust/60 focus:border-rust" : ""}`} />
              {erroLocal && (
                <p className="mt-1.5 text-sm text-rust flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-rust/10 inline-flex items-center justify-center text-[10px] font-bold shrink-0">!</span>
                  {erroLocal}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isPending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {isPending ? "Criando…" : "Criar"}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function PlannerClient({ planners: initialPlanners, tarefas: initialTarefas, todosProfiles, compartilhadosMap: initialCompartilhadosMap, currentUserId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [planners, setPlanners] = useState<Planner[]>(initialPlanners);
  const [tarefas, setTarefas] = useState<PlannerTarefa[]>(initialTarefas);
  const [compartilhadosMap, setCompartilhadosMap] = useState<Record<string, string[]>>(initialCompartilhadosMap);
  const [profilesCache, setProfilesCache] = useState<Profile[]>(todosProfiles);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [pendingTarefaId, setPendingTarefaId] = useState<string | null>(null);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [plannerParaCompartilhar, setPlannerParaCompartilhar] = useState<Planner | null>(null);
  const [tarefaParaRepetir, setTarefaParaRepetir] = useState<PlannerTarefa | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => { setPlanners(initialPlanners); }, [initialPlanners]);
  useEffect(() => { setTarefas(initialTarefas); }, [initialTarefas]);
  useEffect(() => { setCompartilhadosMap(initialCompartilhadosMap); }, [initialCompartilhadosMap]);

  function refresh() { router.refresh(); }

  const selectedPlanner = planners[selectedIdx] ?? planners[0] ?? null;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ── Realtime: tarefas + planners (depende da lista de planners) ──────
  const plannerIdsKey = planners.map(p => p.id).sort().join(",");

  useEffect(() => {
    if (planners.length === 0) return;
    const visibleIds = new Set(planners.map(p => p.id));

    const channel = supabase
      .channel("planner-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "planner_tarefas" }, (payload: any) => {
        const rec = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (!rec?.planner_id || !visibleIds.has(rec.planner_id)) return;
        if (payload.eventType === "INSERT") {
          setTarefas(prev => prev.some(t => t.id === rec.id) ? prev : [...prev, rec]);
        } else if (payload.eventType === "UPDATE") {
          setTarefas(prev => prev.map(t => t.id === rec.id ? { ...t, ...rec } : t));
        } else if (payload.eventType === "DELETE") {
          setTarefas(prev => prev.filter(t => t.id !== rec.id));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "planners" }, (payload: any) => {
        const rec = payload.new;
        if (!rec?.id || !visibleIds.has(rec.id)) return;
        setPlanners(prev => prev.map(p => p.id === rec.id ? { ...p, ...rec } : p));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "planners" }, (payload: any) => {
        const rec = payload.old;
        if (!rec?.id) return;
        setPlanners(prev => prev.filter(p => p.id !== rec.id));
        setTarefas(prev => prev.filter(t => t.planner_id !== rec.id));
        setSelectedIdx(0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerIdsKey]);

  // ── Fetch inicial: garante planners compartilhados mesmo sem Realtime ──
  useEffect(() => {
    supabase
      .from("planner_compartilhamentos")
      .select("planner_id")
      .eq("shared_with_profile_id", currentUserId)
      .then(async ({ data: shared }) => {
        if (!shared || shared.length === 0) return;
        const ids = shared.map(r => r.planner_id as string);
        const { data: sharedPlanners } = await supabase
          .from("planners")
          .select("id, nome, owner_profile_id, profissional_id, ordem, criado_em")
          .in("id", ids);
        if (!sharedPlanners) return;
        // Adiciona planners que ainda não estão na lista
        setPlanners(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const novos = (sharedPlanners as Planner[]).filter(p => !existingIds.has(p.id));
          return novos.length > 0 ? [...prev, ...novos] : prev;
        });
        // Garante donos no cache de perfis
        const ownerIds = sharedPlanners.map((p: any) => p.owner_profile_id).filter(Boolean);
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase
            .from("profiles")
            .select("id, nome_completo, role, email")
            .in("id", ownerIds);
          if (owners) {
            setProfilesCache(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const novos = (owners as Profile[]).filter(p => !existingIds.has(p.id));
              return novos.length > 0 ? [...prev, ...novos] : prev;
            });
          }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ── Realtime: todos os eventos de compartilhamentos (sem filtro, via RLS) ──
  useEffect(() => {
    const channel = supabase
      .channel(`comp-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "planner_compartilhamentos" },
        (payload: any) => {
          const rec = payload.eventType === "DELETE" ? payload.old : payload.new;
          if (!rec?.planner_id) return;
          const pid: string = rec.planner_id;
          const uid: string = rec.shared_with_profile_id;

          if (payload.eventType === "INSERT") {
            // Atualiza mapa para o dono
            setCompartilhadosMap(prev => ({
              ...prev,
              [pid]: [...(prev[pid] ?? []).filter(id => id !== uid), uid],
            }));
            // Destinatário recebe o planner
            if (uid === currentUserId) {
              supabase
                .from("planners")
                .select("id, nome, owner_profile_id, profissional_id, ordem, criado_em")
                .eq("id", pid)
                .single()
                .then(async ({ data }) => {
                  if (!data) return;
                  setPlanners(prev => prev.some(p => p.id === data.id) ? prev : [...prev, data as Planner]);
                  // Garante dono no cache de perfis
                  const ownerId = (data as any).owner_profile_id;
                  if (ownerId) {
                    setProfilesCache(prev => {
                      if (prev.some(p => p.id === ownerId)) return prev;
                      supabase.from("profiles").select("id, nome_completo, role, email").eq("id", ownerId).single()
                        .then(({ data: profile }) => {
                          if (profile) setProfilesCache(c => c.some(p => p.id === profile.id) ? c : [...c, profile as Profile]);
                        });
                      return prev;
                    });
                  }
                });
            }
          } else if (payload.eventType === "DELETE") {
            setCompartilhadosMap(prev => {
              const next = { ...prev };
              next[pid] = (next[pid] ?? []).filter(id => id !== uid);
              return next;
            });
            if (uid === currentUserId) {
              setPlanners(prev => prev.filter(p => p.id !== pid));
              setSelectedIdx(0);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ── Handlers de planner ──────────────────────────────────────────────
  function handleCriarPlanner(nome: string) {
    setModalCriarAberto(false); setErro(null);
    const temp: Planner = {
      id: `temp-${Date.now()}`, nome, owner_profile_id: currentUserId,
      profissional_id: null, ordem: planners.length, criado_em: new Date().toISOString(),
    };
    setPlanners(prev => [...prev, temp]);
    setSelectedIdx(planners.length);
    startTransition(async () => {
      const res = await criarPlanner(nome);
      if (res.error) { setErro(res.error); setPlanners(initialPlanners); }
      else refresh();
    });
  }

  function handleRenomearPlanner(id: string, nome: string) {
    setPlanners(prev => prev.map(p => p.id === id ? { ...p, nome } : p));
    startTransition(async () => {
      const res = await renomearPlanner(id, nome);
      if (res.error) { setErro(res.error); setPlanners(initialPlanners); }
      else refresh();
    });
  }

  function handleRemoverCompartilhamento(id: string) {
    setPlanners(prev => prev.filter(p => p.id !== id));
    setSelectedIdx(0);
    startTransition(async () => {
      const res = await removerCompartilhamento(id);
      if (res.error) { setErro(res.error); setPlanners(initialPlanners); }
      else refresh();
    });
  }

  function handleRemoverTodosCompartilhamentos(id: string) {
    setCompartilhadosMap(prev => ({ ...prev, [id]: [] }));
    startTransition(async () => {
      const res = await salvarCompartilhamentos(id, []);
      if (res.error) { setErro(res.error); setCompartilhadosMap(initialCompartilhadosMap); }
      else refresh();
    });
  }

  function handleExcluirPlanner(id: string) {
    const nextIdx = Math.max(0, selectedIdx - 1);
    setPlanners(prev => prev.filter(p => p.id !== id));
    setSelectedIdx(nextIdx);
    startTransition(async () => {
      const res = await excluirPlanner(id);
      if (res.error) { setErro(res.error); setPlanners(initialPlanners); }
      else refresh();
    });
  }

  // ── Handlers de tarefa ───────────────────────────────────────────────
  function handleAddTarefa(titulo: string, data: string, descricao: string) {
    if (!selectedPlanner) return;
    const temp: PlannerTarefa = {
      id: `temp-${Date.now()}`, planner_id: selectedPlanner.id,
      titulo, descricao: descricao || null, data_tarefa: data,
      concluida: false, concluida_em: null, criado_em: new Date().toISOString(),
    };
    setTarefas(prev => [...prev, temp]);
    startTransition(async () => {
      const res = await criarTarefaPlanner(selectedPlanner.id, titulo, data, descricao);
      if (res.error) { setErro(res.error); setTarefas(initialTarefas); }
      else refresh();
    });
  }

  function handleToggleTarefa(id: string, concluida: boolean) {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, concluida, concluida_em: concluida ? new Date().toISOString() : null } : t));
    setPendingTarefaId(id);
    startTransition(async () => {
      const res = await alternarTarefaPlanner(id, concluida);
      setPendingTarefaId(null);
      if (res.error) { setErro(res.error); setTarefas(initialTarefas); }
      else refresh();
    });
  }

  function handleEditTarefa(id: string, titulo: string, descricao: string) {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, titulo, descricao: descricao || null } : t));
    startTransition(async () => {
      const res = await editarTarefaPlanner(id, titulo, descricao);
      if (res.error) { setErro(res.error); setTarefas(initialTarefas); }
      else refresh();
    });
  }

  function handleRepetirTarefa(tarefa: PlannerTarefa, dates: string[]) {
    setTarefaParaRepetir(null);
    const temps: PlannerTarefa[] = dates.map((data_tarefa, i) => ({
      id: `temp-${Date.now()}-${i}`,
      planner_id: tarefa.planner_id,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      data_tarefa,
      concluida: false,
      concluida_em: null,
      criado_em: new Date().toISOString(),
    }));
    setTarefas(prev => [...prev, ...temps]);
    startTransition(async () => {
      const res = await criarTarefasRepetidas(tarefa.planner_id, tarefa.titulo, tarefa.descricao ?? undefined, dates);
      if (res.error) { setErro(res.error); setTarefas(prev => prev.filter(t => !t.id.startsWith("temp-"))); }
      else refresh();
    });
  }

  function handleDeleteTarefa(id: string) {
    setTarefas(prev => prev.filter(t => t.id !== id));
    startTransition(async () => {
      const res = await excluirTarefaPlanner(id);
      if (res.error) { setErro(res.error); setTarefas(initialTarefas); }
      else refresh();
    });
  }

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* ── Cabeçalho ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-sand/30 px-6 py-4 shrink-0">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-forest-500 mb-0.5">
            Planejamento Semanal{selectedPlanner ? ` · ${selectedPlanner.nome}` : ""}
          </p>
          <h1 className="font-display text-2xl text-forest capitalize">
            {format(weekDays[0], "d MMM", { locale: ptBR })} – {format(weekDays[6], "d 'de' MMMM yyyy", { locale: ptBR })}
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-3 h-8 text-sm rounded-lg border border-sand/40 hover:bg-sand/20 text-forest transition-colors">
              Hoje
            </button>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ErrorBanner message={erro} onDismiss={() => setErro(null)} />
      </div>

      {/* ── Área principal ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {planners.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-forest-400 gap-4">
            <CalendarRange className="w-14 h-14 opacity-20" />
            <div className="text-center">
              <p className="font-display text-lg text-forest">Nenhum planner encontrado</p>
              <p className="text-sm text-forest-500 mt-1">Crie seu primeiro planner para começar.</p>
            </div>
            <button onClick={() => setModalCriarAberto(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Criar planner
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <div className="grid grid-cols-7 min-h-full" style={{ minWidth: 700 }}>
              {weekDays.map(date => (
                <DiaCell key={date.toISOString()} date={date} tarefas={tarefas}
                  plannerId={selectedPlanner?.id ?? ""}
                  isOwner={selectedPlanner?.owner_profile_id === currentUserId}
                  onAddTarefa={(titulo, data, descricao) => handleAddTarefa(titulo, data, descricao)}
                  onToggleTarefa={handleToggleTarefa}
                  onEditTarefa={(id, titulo, descricao) => handleEditTarefa(id, titulo, descricao)}
                  onDeleteTarefa={handleDeleteTarefa}
                  onRepeatTarefa={setTarefaParaRepetir}
                  pendingId={pendingTarefaId} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Barra de abas ─────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-sand/30 flex items-center overflow-x-auto px-2">
        {planners.map((p, idx) => {
          const isOwner = p.owner_profile_id === currentUserId;
          // Nomes para o tooltip: dono vê com quem compartilhou; convidado vê quem compartilhou
          const sharedNames = isOwner
            ? (compartilhadosMap[p.id] ?? [])
                .map(pid => profilesCache.find(pr => pr.id === pid)?.nome_completo)
                .filter((n): n is string => Boolean(n))
            : (() => {
                const ownerName = profilesCache.find(pr => pr.id === p.owner_profile_id)?.nome_completo;
                // Destinatário sempre vê o ícone; usa o nome do dono ou fallback
                return [ownerName ?? "Planner compartilhado"];
              })();

          return (
            <PlannerTab key={p.id} planner={p} active={selectedPlanner?.id === p.id}
              isOwner={isOwner}
              sharedNames={sharedNames}
              onClick={() => setSelectedIdx(idx)}
              onRename={nome => handleRenomearPlanner(p.id, nome)}
              onDelete={() => handleExcluirPlanner(p.id)}
              onShare={() => setPlannerParaCompartilhar(p)}
              onRemoveShare={() => handleRemoverCompartilhamento(p.id)}
              onRemoveAllShares={() => handleRemoverTodosCompartilhamentos(p.id)} />

          );
        })}
        <button onClick={() => setModalCriarAberto(true)}
          className="flex items-center gap-1 px-2 py-2.5 text-forest-300 hover:text-forest transition-colors"
          title="Novo planner">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Modais ─────────────────────────────────────────────────── */}
      {modalCriarAberto && (
        <ModalCriarPlanner
          existingNames={planners.filter(p => p.owner_profile_id === currentUserId).map(p => p.nome)}
          onConfirm={handleCriarPlanner}
          onClose={() => setModalCriarAberto(false)}
          isPending={false} />
      )}

      {tarefaParaRepetir && (
        <ModalRepetirTarefa
          tarefa={tarefaParaRepetir}
          onClose={() => setTarefaParaRepetir(null)}
          onConfirm={dates => handleRepetirTarefa(tarefaParaRepetir, dates)} />
      )}

      {plannerParaCompartilhar && (
        <ModalCompartilhar
          planner={plannerParaCompartilhar}
          todosProfiles={profilesCache}
          currentUserId={currentUserId}
          onClose={() => setPlannerParaCompartilhar(null)} />
      )}
    </div>
  );
}
