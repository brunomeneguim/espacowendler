"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Check, Trash2, X, Loader2, Clock,
  Flag, StickyNote, CheckSquare, ChevronDown, ChevronUp,
  Pencil, RepeatIcon, Save,
} from "lucide-react";
import { criarTarefa, atualizarTarefa, alternarTarefa, excluirTarefa, criarPostit, atualizarPostit, excluirPostit } from "./actions";

// ── Tipos ─────────────────────────────────────────────────────────
interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string | null;
  concluida: boolean;
  prioridade: "baixa" | "normal" | "alta";
  data_vencimento?: string | null;
  criado_em: string;
  concluida_em?: string | null;
  criado_por?: string | null;
  atribuido_para?: string | null;
  repeticao?: string | null;
  criador?: { nome_completo: string } | null;
  responsavel?: { nome_completo: string } | null;
}

interface Postit {
  id: string;
  conteudo: string;
  cor: string;
  criado_em: string;
  criado_por?: string | null;
  criador?: { nome_completo: string } | null;
}

interface Profile { id: string; nome_completo: string }

// ── Cores dos post-its ────────────────────────────────────────────
const POSTIT_CORES: Record<string, { bg: string; border: string; label: string }> = {
  yellow:  { bg: "bg-yellow-100",  border: "border-yellow-300",  label: "Amarelo"  },
  blue:    { bg: "bg-blue-100",    border: "border-blue-300",    label: "Azul"     },
  green:   { bg: "bg-green-100",   border: "border-green-300",   label: "Verde"    },
  pink:    { bg: "bg-pink-100",    border: "border-pink-300",    label: "Rosa"     },
  purple:  { bg: "bg-purple-100",  border: "border-purple-300",  label: "Roxo"     },
  orange:  { bg: "bg-orange-100",  border: "border-orange-300",  label: "Laranja"  },
};

const PRIORIDADE: Record<string, { label: string; dot: string }> = {
  baixa:  { label: "Baixa",  dot: "bg-gray-400"   },
  normal: { label: "Normal", dot: "bg-blue-400"   },
  alta:   { label: "Alta",   dot: "bg-red-500"    },
};

const REPETICAO: Record<string, string> = {
  nenhuma: "Não repete",
  diaria:  "Diariamente",
  semanal: "Semanalmente",
  mensal:  "Mensalmente",
};

const PRIORIDADE_ORDEM: Record<string, number> = { alta: 0, normal: 1, baixa: 2 };

// ── Modal tarefa (criar/editar) ───────────────────────────────────
function ModalTarefa({
  profiles, tarefa, onClose, onSaved,
}: {
  profiles: Profile[];
  tarefa?: Tarefa;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const hoje = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    startTransition(async () => {
      const res = tarefa
        ? await atualizarTarefa(tarefa.id, fd)
        : await criarTarefa(fd);
      if (res.error) { setErro(res.error); }
      else { onSaved(); onClose(); }
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-sand/30">
            <h2 className="font-display text-lg text-forest">{tarefa ? "Editar tarefa" : "Nova tarefa"}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand/20 text-forest-400"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {erro && <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">{erro}</div>}
            <div>
              <label className="label">Título <span className="text-rust">*</span></label>
              <input name="titulo" type="text" required className="input-field" placeholder="Descreva a tarefa…"
                defaultValue={tarefa?.titulo} autoFocus />
            </div>
            <div>
              <label className="label">Descrição <span className="text-forest-400">(opcional)</span></label>
              <textarea name="descricao" rows={2} className="input-field resize-none"
                placeholder="Detalhes adicionais…" defaultValue={tarefa?.descricao ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prioridade</label>
                <select name="prioridade" className="input-field" defaultValue={tarefa?.prioridade ?? "normal"}>
                  <option value="baixa">🔵 Baixa</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="alta">🔴 Alta</option>
                </select>
              </div>
              <div>
                <label className="label">Vencimento</label>
                <input name="data_vencimento" type="date" className="input-field" defaultValue={tarefa?.data_vencimento ?? hoje} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Repetição</label>
                <select name="repeticao" className="input-field" defaultValue={tarefa?.repeticao ?? "nenhuma"}>
                  <option value="nenhuma">Não repete</option>
                  <option value="diaria">Diariamente</option>
                  <option value="semanal">Semanalmente</option>
                  <option value="mensal">Mensalmente</option>
                </select>
              </div>
              <div>
                <label className="label">Atribuir a</label>
                <select name="atribuido_para" className="input-field" defaultValue={tarefa?.atribuido_para ?? profiles[0]?.id ?? ""}>
                  <option value="">— Sem responsável —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : tarefa ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isPending ? "Salvando…" : tarefa ? "Salvar alterações" : "Criar tarefa"}
              </button>
              <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Modal de novo/editar post-it ──────────────────────────────────
function ModalPostit({
  postit, onClose, onSaved,
}: {
  postit?: Postit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [cor, setCor] = useState(postit?.cor ?? "yellow");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("cor", cor);
    startTransition(async () => {
      if (postit) {
        await atualizarPostit(postit.id, fd);
      } else {
        await criarPostit(fd);
      }
      onSaved();
      onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className={`rounded-2xl shadow-2xl w-full max-w-sm border ${POSTIT_CORES[cor].bg} ${POSTIT_CORES[cor].border}`}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
            <h2 className="font-medium text-gray-700">{postit ? "Editar lembrete" : "Novo post-it"}</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-black/10 text-gray-500"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
            <textarea name="conteudo" rows={4} required autoFocus
              className="w-full bg-transparent text-gray-800 placeholder-gray-400 resize-none outline-none text-sm"
              placeholder="Escreva um lembrete…"
              defaultValue={postit?.conteudo ?? ""} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Cor:</span>
              {Object.entries(POSTIT_CORES).map(([id, c]) => (
                <button key={id} type="button" onClick={() => setCor(id)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${c.bg} ${cor === id ? "border-gray-600 scale-110" : "border-transparent hover:scale-105"}`}
                />
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isPending} className="flex-1 bg-white/60 hover:bg-white border border-black/10 text-gray-700 text-sm rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5 font-medium transition-colors">
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : postit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {postit ? "Salvar" : "Adicionar"}
              </button>
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Item de tarefa ────────────────────────────────────────────────
function TarefaItem({ tarefa, onToggle, onDelete, onEdit, pending }: {
  tarefa: Tarefa;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  pending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const pri = PRIORIDADE[tarefa.prioridade] ?? PRIORIDADE.normal;
  const vencida = tarefa.data_vencimento && !tarefa.concluida && new Date(tarefa.data_vencimento + "T12:00:00") < new Date();
  const rep = tarefa.repeticao && tarefa.repeticao !== "nenhuma" ? REPETICAO[tarefa.repeticao] : null;

  return (
    <div className={`group rounded-xl border transition-all ${tarefa.concluida ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-sand/40 hover:border-forest/20"} ${pending ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${tarefa.concluida ? "bg-forest border-forest text-cream" : "border-gray-300 hover:border-forest"}`}
        >
          {tarefa.concluida && <Check className="w-3 h-3" />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(v => !v)}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${tarefa.concluida ? "line-through text-gray-400" : "text-forest"}`}>
              {tarefa.titulo}
            </span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${pri.dot}`} title={pri.label} />
            {rep && (
              <span className="flex items-center gap-0.5 text-[10px] bg-forest/10 text-forest px-1.5 py-0.5 rounded-full shrink-0">
                <RepeatIcon className="w-2.5 h-2.5" /> {rep}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {tarefa.responsavel && (
              <span className="text-xs text-forest-400 truncate">{tarefa.responsavel.nome_completo}</span>
            )}
            {tarefa.data_vencimento && (
              <span className={`flex items-center gap-1 text-xs ${vencida ? "text-red-500 font-medium" : "text-forest-400"}`}>
                <Clock className="w-3 h-3" />
                {format(new Date(tarefa.data_vencimento + "T12:00:00"), "dd MMM", { locale: ptBR })}
                {vencida && " · Vencida"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {tarefa.descricao && (
            <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-sand/20 text-forest-400">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-400 hover:text-forest">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rust/10 text-forest-400 hover:text-rust">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && tarefa.descricao && (
        <div className="px-4 pb-3 text-sm text-forest-500 border-t border-sand/20 pt-2">
          {tarefa.descricao}
          {tarefa.criador && (
            <p className="text-xs text-forest-400 mt-1">Criado por {tarefa.criador.nome_completo}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card de post-it ───────────────────────────────────────────────
function PostitCard({ postit, onEdit, onDelete, pending }: {
  postit: Postit;
  onEdit: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const c = POSTIT_CORES[postit.cor] ?? POSTIT_CORES.yellow;
  return (
    <div className={`relative rounded-xl border p-4 shadow-sm group transition-all hover:shadow-md ${c.bg} ${c.border} ${pending ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onEdit} className="p-1 rounded hover:bg-black/10 text-gray-500">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-black/10 text-gray-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap pr-10">{postit.conteudo}</p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
        {postit.criador && <span>{postit.criador.nome_completo}</span>}
        <span>·</span>
        <span>{format(new Date(postit.criado_em), "dd/MM HH:mm")}</span>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────
interface Props {
  tarefas: Tarefa[];
  postits: Postit[];
  profiles: Profile[];
  currentUserId: string;
  currentRole: string;
}

export function TarefasClient({ tarefas, postits, profiles, currentUserId, currentRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showModalTarefa, setShowModalTarefa] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [showModalPostit, setShowModalPostit] = useState(false);
  const [editingPostit, setEditingPostit] = useState<Postit | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "minhas" | "concluidas">("todas");

  function refresh() { router.refresh(); }

  async function handleToggle(id: string, concluida: boolean) {
    setPendingId(id);
    startTransition(async () => {
      await alternarTarefa(id, concluida);
      setPendingId(null);
      refresh();
    });
  }

  async function handleDeleteTarefa(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await excluirTarefa(id);
      setPendingId(null);
      refresh();
    });
  }

  async function handleDeletePostit(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await excluirPostit(id);
      setPendingId(null);
      refresh();
    });
  }

  const tarefasFiltradas = tarefas
    .filter(t => {
      if (filtro === "minhas") return (t.atribuido_para === currentUserId || t.criado_por === currentUserId) && !t.concluida;
      if (filtro === "concluidas") return t.concluida;
      return !t.concluida;
    })
    .sort((a, b) => (PRIORIDADE_ORDEM[a.prioridade] ?? 1) - (PRIORIDADE_ORDEM[b.prioridade] ?? 1));

  const pendentes = tarefas.filter(t => !t.concluida).length;
  const minhas = tarefas.filter(t => !t.concluida && (t.atribuido_para === currentUserId || t.criado_por === currentUserId)).length;

  return (
    <div className="p-6 md:p-10 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-forest-500 mb-0.5">Organização</p>
          <h1 className="font-display text-2xl text-forest">Tarefas</h1>
          <p className="text-sm text-forest-500 mt-0.5">{pendentes} pendente{pendentes !== 1 ? "s" : ""} · {postits.length} lembrete{postits.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingPostit(null); setShowModalPostit(true); }} className="btn-ghost flex items-center gap-1.5 text-sm">
            <StickyNote className="w-4 h-4" /> Post-it
          </button>
          <button onClick={() => { setEditingTarefa(null); setShowModalTarefa(true); }} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> Nova tarefa
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Coluna de Tarefas ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtros */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-sand/20 rounded-xl text-sm flex-1">
              {([
                ["todas", `Pendentes (${pendentes})`],
                ["minhas", `Minhas (${minhas})`],
                ["concluidas", "Concluídas"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFiltro(id)}
                  className={`flex-1 px-3 py-1.5 rounded-lg transition-colors ${filtro === id ? "bg-white text-forest shadow-sm font-medium" : "text-forest-500 hover:text-forest hover:bg-white/50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Botão "+" rápido na área de tarefas */}
            <button
              onClick={() => { setEditingTarefa(null); setShowModalTarefa(true); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-sand/40 hover:bg-sand/20 text-forest transition-colors shrink-0"
              title="Nova tarefa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Lista */}
          {tarefasFiltradas.length === 0 ? (
            <div className="text-center py-16 text-forest-400">
              <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma tarefa {filtro === "concluidas" ? "concluída" : "pendente"}.</p>
              {filtro !== "concluidas" && (
                <button onClick={() => { setEditingTarefa(null); setShowModalTarefa(true); }} className="mt-3 text-sm text-forest hover:underline">
                  Criar primeira tarefa
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tarefasFiltradas.map(t => (
                <TarefaItem
                  key={t.id}
                  tarefa={t}
                  onToggle={() => handleToggle(t.id, !t.concluida)}
                  onDelete={() => handleDeleteTarefa(t.id)}
                  onEdit={() => { setEditingTarefa(t); setShowModalTarefa(true); }}
                  pending={pendingId === t.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Coluna de Post-its ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-forest uppercase tracking-wider flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> Lembretes
            </h2>
            <button
              onClick={() => { setEditingPostit(null); setShowModalPostit(true); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {postits.length === 0 ? (
            <div className="text-center py-12 text-forest-400">
              <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum post-it ainda.</p>
              <button onClick={() => { setEditingPostit(null); setShowModalPostit(true); }} className="mt-2 text-xs text-forest hover:underline">
                Adicionar lembrete
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {postits.map(p => (
                <PostitCard
                  key={p.id}
                  postit={p}
                  onEdit={() => { setEditingPostit(p); setShowModalPostit(true); }}
                  onDelete={() => handleDeletePostit(p.id)}
                  pending={pendingId === p.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {showModalTarefa && (
        <ModalTarefa
          profiles={profiles}
          tarefa={editingTarefa ?? undefined}
          onClose={() => { setShowModalTarefa(false); setEditingTarefa(null); }}
          onSaved={refresh}
        />
      )}

      {showModalPostit && (
        <ModalPostit
          postit={editingPostit ?? undefined}
          onClose={() => { setShowModalPostit(false); setEditingPostit(null); }}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
