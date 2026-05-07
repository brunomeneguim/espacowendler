"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  startOfWeek, addWeeks, subWeeks, addDays, format, isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2, Pencil, X,
  CalendarRange, MoreHorizontal, Share2, Users,
} from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  criarPlanner, renomearPlanner, excluirPlanner,
  criarTarefaPlanner, editarTarefaPlanner, alternarTarefaPlanner, excluirTarefaPlanner,
  buscarCompartilhamentos, salvarCompartilhamentos, removerCompartilhamento,
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
              <span className="text-sm text-forest-400 font-halimun">· {planner.nome}</span>
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
            {erro && <p className="text-xs text-rust text-center">{erro}</p>}
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
  tarefa, onToggle, onEdit, onDelete, pending,
}: {
  tarefa: PlannerTarefa;
  onToggle: () => void;
  onEdit: (titulo: string, descricao: string) => void;
  onDelete: () => void;
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
          <div className="flex flex-col gap-1">
            <input ref={tituloRef} value={titulo} onChange={e => setTitulo(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="Título"
              className="w-full text-xs font-semibold text-forest bg-white border border-forest/30 rounded px-1.5 py-0.5 outline-none focus:border-forest/60" />
            <input value={descricao} onChange={e => setDescricao(e.target.value)}
              onBlur={handleEditSave} onKeyDown={handleKeyDown} placeholder="Descrição (opcional)"
              className="w-full text-xs text-forest bg-white border border-forest/30 rounded px-1.5 py-0.5 outline-none focus:border-forest/60" />
          </div>
        ) : (
          <div onClick={onToggle} onDoubleClick={e => { e.stopPropagation(); setEditando(true); }}
            className={`cursor-pointer select-none ${textoColor} transition-colors`}>
            <p className="text-sm font-halimun font-semibold leading-tight break-words">{tarefa.titulo}</p>
            {tarefa.descricao && (
              <p className="text-sm font-halimun leading-snug break-words mt-0.5 opacity-80">{tarefa.descricao}</p>
            )}
          </div>
        )}
      </div>

      {!editando && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity mt-0.5">
          <button onClick={() => setEditando(true)} className="p-0.5 rounded hover:bg-forest/10 text-forest-400 hover:text-forest">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="p-0.5 rounded hover:bg-rust/10 text-forest-400 hover:text-rust">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Célula do dia ─────────────────────────────────────────────────────────────
function DiaCell({
  date, tarefas, plannerId, onAddTarefa, onToggleTarefa, onEditTarefa, onDeleteTarefa, pendingId,
}: {
  date: Date; tarefas: PlannerTarefa[]; plannerId: string;
  onAddTarefa: (titulo: string, data: string, descricao: string) => void;
  onToggleTarefa: (id: string, concluida: boolean) => void;
  onEditTarefa: (id: string, titulo: string, descricao: string) => void;
  onDeleteTarefa: (id: string) => void;
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
          className="min-w-0 w-32 text-sm font-halimun bg-transparent border-b border-forest/40 outline-none text-forest" autoFocus />
      ) : (
        <span
          className={`text-sm font-halimun whitespace-nowrap transition-colors ${active ? "text-forest font-semibold" : "text-forest-400 hover:text-forest"}`}
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

  // ── Realtime: compartilhamentos recebidos (INSERT filtrado pelo currentUserId) ─
  useEffect(() => {
    const channelInsert = supabase
      .channel(`comp-insert-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "planner_compartilhamentos",
          filter: `shared_with_profile_id=eq.${currentUserId}`,
        },
        (payload: any) => {
          const pid: string = payload.new.planner_id;
          // Busca e adiciona o planner à lista
          supabase
            .from("planners")
            .select("id, nome, owner_profile_id, profissional_id, ordem, criado_em")
            .eq("id", pid)
            .single()
            .then(({ data }) => {
              if (!data) return;
              setPlanners(prev => prev.some(p => p.id === data.id) ? prev : [...prev, data as Planner]);
              // Garante que o dono do planner está no cache de perfis
              const ownerId = data.owner_profile_id;
              if (ownerId) {
                setProfilesCache(prev => {
                  if (prev.some(p => p.id === ownerId)) return prev;
                  // Busca o perfil do dono se ainda não estiver no cache
                  supabase
                    .from("profiles")
                    .select("id, nome_completo, role, email")
                    .eq("id", ownerId)
                    .single()
                    .then(({ data: profile }) => {
                      if (profile) setProfilesCache(c => c.some(p => p.id === profile.id) ? c : [...c, profile as Profile]);
                    });
                  return prev;
                });
              }
            });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channelInsert); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ── Realtime: compartilhamentos removidos (DELETE filtrado pelo currentUserId) ─
  useEffect(() => {
    const channelDelete = supabase
      .channel(`comp-delete-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "planner_compartilhamentos",
          filter: `shared_with_profile_id=eq.${currentUserId}`,
        },
        (payload: any) => {
          const pid: string = payload.old.planner_id;
          setPlanners(prev => prev.filter(p => p.id !== pid));
          setSelectedIdx(0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channelDelete); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ── Realtime: atualiza compartilhadosMap para o dono (todos os eventos) ─
  useEffect(() => {
    const channelOwner = supabase
      .channel(`comp-owner-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "planner_compartilhamentos" },
        (payload: any) => {
          const rec = payload.eventType === "DELETE" ? payload.old : payload.new;
          if (!rec?.planner_id) return;
          const pid: string = rec.planner_id;
          const uid: string = rec.shared_with_profile_id;
          if (payload.eventType === "INSERT") {
            setCompartilhadosMap(prev => ({
              ...prev,
              [pid]: [...(prev[pid] ?? []).filter(id => id !== uid), uid],
            }));
          } else if (payload.eventType === "DELETE") {
            setCompartilhadosMap(prev => {
              const next = { ...prev };
              next[pid] = (next[pid] ?? []).filter(id => id !== uid);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channelOwner); };
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

        {erro && (
          <div className="mt-3 p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust flex items-center gap-2">
            <span className="flex-1">{erro}</span>
            <button onClick={() => setErro(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
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
                  onAddTarefa={(titulo, data, descricao) => handleAddTarefa(titulo, data, descricao)}
                  onToggleTarefa={handleToggleTarefa}
                  onEditTarefa={(id, titulo, descricao) => handleEditTarefa(id, titulo, descricao)}
                  onDeleteTarefa={handleDeleteTarefa}
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
