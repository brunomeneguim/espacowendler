"use client";

import { useState, useTransition, useRef } from "react";
import { Building2, Check, Loader2, Pencil, Plus, X, DollarSign, GripVertical, Trash2, AlertTriangle, ToggleRight, ToggleLeft } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { criarSala, atualizarSala, toggleAtivoSala, atualizarAluguelProfissional, reordenarSalas, excluirSala, excluirSalaComAgendamentos } from "./actions";

interface Sala { id: number; nome: string; ativo: boolean; ordem?: number }
interface Profissional { id: string; valor_aluguel_sala: number; profile: { nome_completo: string } | null }

export function SalasClient({
  salas: initialSalas,
  profissionais: initialProfissionais,
  canManage = false,
  isAdmin = false,
}: {
  salas: Sala[];
  profissionais: Profissional[];
  canManage?: boolean;
  isAdmin?: boolean;
}) {
  const [salas, setSalas] = useState<Sala[]>(initialSalas);
  const [profissionais, setProfissionais] = useState<Profissional[]>(initialProfissionais);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Drag-and-drop de ordenação (admin only)
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setSalas(prev => {
      const ativas = prev.filter(s => s.ativo);
      const inativas = prev.filter(s => !s.ativo);
      const [moved] = ativas.splice(from, 1);
      ativas.splice(index, 0, moved);
      dragIndexRef.current = index;
      return [...ativas, ...inativas];
    });
  }

  function handleDragEnd() {
    setDragOverIndex(null);
    dragIndexRef.current = null;
    // Salvar nova ordem
    const ativas = salas.filter(s => s.ativo);
    startTransition(async () => {
      const res = await reordenarSalas(ativas.map(s => s.id));
      if (res?.error) { setErro(res.error); }
    });
  }

  // Nova sala
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);

  // Edição de nome inline
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");

  // Edição de aluguel inline
  const [editandoAluguelId, setEditandoAluguelId] = useState<string | null>(null);
  const [editAluguel, setEditAluguel] = useState("");

  // Exclusão de sala
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [excluindoCount, setExcluindoCount] = useState<number>(0);

  function handleCriar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setErro(null);
    startTransition(async () => {
      const res = await criarSala(nome);
      if (res.error) { setErro(res.error); return; }
      setSalas(prev => [...prev, { id: Date.now(), nome, ativo: true }]);
      setNovoNome("");
      setCriando(false);
      window.location.reload();
    });
  }

  function iniciarEdicao(sala: Sala) {
    setEditandoId(sala.id);
    setEditNome(sala.nome);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEditNome("");
  }

  function handleSalvarEdicao(id: number) {
    const nome = editNome.trim();
    if (!nome) return;
    setErro(null);
    startTransition(async () => {
      const res = await atualizarSala(id, nome);
      if (res.error) { setErro(res.error); return; }
      setSalas(prev => prev.map(s => s.id === id ? { ...s, nome } : s));
      setEditandoId(null);
    });
  }

  function handleToggle(id: number) {
    setErro(null);
    startTransition(async () => {
      const res = await toggleAtivoSala(id);
      if (res.error) { setErro(res.error); return; }
      setSalas(prev => prev.map(s => s.id === id ? { ...s, ativo: !s.ativo } : s));
    });
  }

  function iniciarEdicaoAluguel(prof: Profissional) {
    setEditandoAluguelId(prof.id);
    setEditAluguel(String(prof.valor_aluguel_sala ?? 50));
  }

  function cancelarEdicaoAluguel() {
    setEditandoAluguelId(null);
    setEditAluguel("");
  }

  async function handleExcluir(id: number) {
    setErro(null);
    startTransition(async () => {
      const res = await excluirSala(id);
      if (res.error) { setErro(res.error); return; }
      if ((res.count ?? 0) > 0) {
        // Há agendamentos — mostrar confirmação
        setExcluindoId(id);
        setExcluindoCount(res.count!);
      } else {
        // Excluído com sucesso
        setSalas(prev => prev.filter(s => s.id !== id));
      }
    });
  }

  async function handleExcluirComAgendamentos() {
    if (!excluindoId) return;
    setErro(null);
    startTransition(async () => {
      const res = await excluirSalaComAgendamentos(excluindoId!);
      if (res.error) { setErro(res.error); return; }
      setSalas(prev => prev.filter(s => s.id !== excluindoId));
      setExcluindoId(null);
      setExcluindoCount(0);
    });
  }

  function handleSalvarAluguel(id: string) {
    const valor = parseFloat(editAluguel.replace(",", "."));
    if (isNaN(valor) || valor < 0) return;
    setErro(null);
    startTransition(async () => {
      const res = await atualizarAluguelProfissional(id, valor);
      if (res.error) { setErro(res.error); return; }
      setProfissionais(prev => prev.map(p => p.id === id ? { ...p, valor_aluguel_sala: valor } : p));
      setEditandoAluguelId(null);
    });
  }

  const ativas = salas.filter(s => s.ativo);
  const inativas = salas.filter(s => !s.ativo);

  return (
    <div className="space-y-6">
      <ErrorBanner message={erro} />

      {/* ── Salas ativas ── */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-forest/5 border-b border-sand/30">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-forest" />
            <h2 className="font-display text-base text-forest">Salas ativas</h2>
            <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full">{ativas.length}</span>
          </div>
          {canManage && !criando && (
            <button
              type="button"
              onClick={() => setCriando(true)}
              className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nova sala
            </button>
          )}
        </div>

        <div className="divide-y divide-sand/20">
          {ativas.length === 0 && !criando && (
            <p className="px-5 py-4 text-sm text-forest-400">Nenhuma sala ativa. Crie uma acima.</p>
          )}

          {ativas.map((sala, index) => (
            <div
              key={sala.id}
              draggable={isAdmin}
              onDragStart={isAdmin ? () => handleDragStart(index) : undefined}
              onDragOver={isAdmin ? (e) => handleDragOver(e, index) : undefined}
              onDragEnd={isAdmin ? handleDragEnd : undefined}
              className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                isAdmin ? "cursor-grab active:cursor-grabbing" : ""
              } ${dragOverIndex === index && dragIndexRef.current !== index ? "bg-forest/5" : ""}`}
            >
              {isAdmin && (
                <GripVertical className="w-4 h-4 text-forest/25 shrink-0 hover:text-forest/50" />
              )}
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />

              {editandoId === sala.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleSalvarEdicao(sala.id);
                    if (e.key === "Escape") cancelarEdicao();
                  }}
                  className="flex-1 text-sm border-b border-forest/30 focus:border-forest focus:outline-none bg-transparent py-0.5"
                />
              ) : (
                <span className="flex-1 text-sm text-forest">{sala.nome}</span>
              )}

              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  {editandoId === sala.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSalvarEdicao(sala.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-forest hover:bg-forest/10 transition-colors"
                        title="Salvar"
                      >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicao}
                        className="p-1.5 rounded-lg text-forest-400 hover:bg-sand/20 transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggle(sala.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-forest-400 hover:text-rust hover:bg-rust/5 transition-colors disabled:opacity-50"
                        title="Desativar sala"
                      >
                        <ToggleRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(sala)}
                        className="p-1.5 rounded-lg text-forest-400 hover:text-forest hover:bg-sand/20 transition-colors"
                        title="Renomear"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleExcluir(sala.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-forest-400 hover:text-rust hover:bg-rust/10 transition-colors disabled:opacity-50"
                          title="Excluir sala"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Form nova sala */}
          {canManage && criando && (
            <div className="flex items-center gap-3 px-5 py-3 bg-forest/5">
              <div className="w-2 h-2 rounded-full bg-sand/40 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Nome da sala…"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleCriar();
                  if (e.key === "Escape") { setCriando(false); setNovoNome(""); }
                }}
                className="flex-1 text-sm focus:outline-none bg-transparent border-b border-forest/30 focus:border-forest py-0.5"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCriar}
                  disabled={isPending || !novoNome.trim()}
                  className="p-1.5 rounded-lg text-forest hover:bg-forest/10 transition-colors disabled:opacity-50"
                  title="Criar"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setCriando(false); setNovoNome(""); }}
                  className="p-1.5 rounded-lg text-forest-400 hover:bg-sand/20 transition-colors"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Salas inativas ── */}
      {inativas.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-sand/10 border-b border-sand/30">
            <Building2 className="w-4 h-4 text-forest-400" />
            <h2 className="font-display text-base text-forest-500">Salas inativas</h2>
            <span className="text-xs bg-sand/30 text-forest-400 px-2 py-0.5 rounded-full">{inativas.length}</span>
          </div>
          <div className="divide-y divide-sand/20">
            {inativas.map(sala => (
              <div key={sala.id} className="flex items-center gap-3 px-5 py-3 opacity-60">
                <div className="w-2 h-2 rounded-full bg-sand/40 shrink-0" />
                <span className="flex-1 text-sm text-forest-400 line-through">{sala.nome}</span>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(sala.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-forest-400 hover:text-forest hover:bg-forest/10 transition-colors disabled:opacity-50"
                      title="Reativar sala"
                    >
                      <ToggleLeft className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleExcluir(sala.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-forest-400 hover:text-rust hover:bg-rust/10 transition-colors disabled:opacity-50"
                        title="Excluir sala"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-forest-400">
        Salas desativadas não aparecem no formulário de agendamento. Elas não são excluídas — agendamentos históricos ficam preservados.
      </p>

      {/* ── Modal confirmação de exclusão com agendamentos ── */}
      {excluindoId !== null && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => { setExcluindoId(null); setExcluindoCount(0); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rust/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rust" />
                </div>
                <div>
                  <h3 className="font-display text-base text-forest">Sala com agendamentos</h3>
                  <p className="text-xs text-forest-500 mt-0.5">
                    Esta sala possui <strong>{excluindoCount}</strong> agendamento{excluindoCount !== 1 ? "s" : ""} registrado{excluindoCount !== 1 ? "s" : ""}.
                  </p>
                </div>
              </div>
              <p className="text-sm text-forest-600">
                Para excluir a sala, todos os agendamentos vinculados a ela também serão excluídos permanentemente. Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleExcluirComAgendamentos}
                  disabled={isPending}
                  className="flex-1 bg-rust text-cream px-4 py-2 rounded-xl text-sm font-medium hover:bg-rust/90 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Excluir tudo
                </button>
                <button
                  type="button"
                  onClick={() => { setExcluindoId(null); setExcluindoCount(0); }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Aluguel por profissional ── */}
      {profissionais.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-forest/5 border-b border-sand/30">
            <DollarSign className="w-4 h-4 text-forest" />
            <h2 className="font-display text-base text-forest">Aluguel de sala por profissional</h2>
          </div>
          <p className="px-5 py-2.5 text-xs text-forest-400 border-b border-sand/10">
            Valor cobrado por sessão realizada ou falta cobrada. Deduzido do repasse ao profissional.
          </p>
          <div className="divide-y divide-sand/20">
            {profissionais.map(prof => (
              <div key={prof.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex-1 text-sm text-forest">{prof.profile?.nome_completo ?? "—"}</span>

                {canManage && editandoAluguelId === prof.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm text-forest-500">R$</span>
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      step="0.01"
                      value={editAluguel}
                      onChange={e => setEditAluguel(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSalvarAluguel(prof.id);
                        if (e.key === "Escape") cancelarEdicaoAluguel();
                      }}
                      className="w-24 text-sm border-b border-forest/30 focus:border-forest focus:outline-none bg-transparent py-0.5 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleSalvarAluguel(prof.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-forest hover:bg-forest/10 transition-colors"
                      title="Salvar"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicaoAluguel}
                      className="p-1.5 rounded-lg text-forest-400 hover:bg-sand/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium text-forest">
                      {Number(prof.valor_aluguel_sala ?? 50).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => iniciarEdicaoAluguel(prof)}
                        className="p-1.5 rounded-lg text-forest-400 hover:text-forest hover:bg-sand/20 transition-colors"
                        title="Editar valor"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
