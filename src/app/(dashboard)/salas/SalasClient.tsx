"use client";

import { useState, useTransition } from "react";
import { Building2, Check, Loader2, Pencil, Plus, X, DollarSign } from "lucide-react";
import { criarSala, atualizarSala, toggleAtivoSala, atualizarAluguelProfissional } from "./actions";

interface Sala { id: number; nome: string; ativo: boolean }
interface Profissional { id: string; valor_aluguel_sala: number; profile: { nome_completo: string } | null }

export function SalasClient({
  salas: initialSalas,
  profissionais: initialProfissionais,
}: {
  salas: Sala[];
  profissionais: Profissional[];
}) {
  const [salas, setSalas] = useState<Sala[]>(initialSalas);
  const [profissionais, setProfissionais] = useState<Profissional[]>(initialProfissionais);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Nova sala
  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);

  // Edição de nome inline
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");

  // Edição de aluguel inline
  const [editandoAluguelId, setEditandoAluguelId] = useState<string | null>(null);
  const [editAluguel, setEditAluguel] = useState("");

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
      {erro && (
        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-sm text-rust">
          {erro}
        </div>
      )}

      {/* ── Salas ativas ── */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-forest/5 border-b border-sand/30">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-forest" />
            <h2 className="font-display text-base text-forest">Salas ativas</h2>
            <span className="text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full">{ativas.length}</span>
          </div>
          {!criando && (
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

          {ativas.map(sala => (
            <div key={sala.id} className="flex items-center gap-3 px-5 py-3">
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
                      onClick={() => iniciarEdicao(sala)}
                      className="p-1.5 rounded-lg text-forest-400 hover:text-forest hover:bg-sand/20 transition-colors"
                      title="Renomear"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(sala.id)}
                      disabled={isPending}
                      className="text-xs px-2.5 py-1 rounded-lg border border-sand/40 text-forest-500 hover:bg-rust/5 hover:text-rust hover:border-rust/30 transition-colors disabled:opacity-50"
                    >
                      Desativar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Form nova sala */}
          {criando && (
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
                <button
                  type="button"
                  onClick={() => handleToggle(sala.id)}
                  disabled={isPending}
                  className="text-xs px-2.5 py-1 rounded-lg border border-sand/40 text-forest-500 hover:bg-forest/5 hover:text-forest hover:border-forest/30 transition-colors disabled:opacity-50"
                >
                  Reativar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-forest-400">
        Salas desativadas não aparecem no formulário de agendamento. Elas não são excluídas — agendamentos históricos ficam preservados.
      </p>

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

                {editandoAluguelId === prof.id ? (
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
                    <button
                      type="button"
                      onClick={() => iniciarEdicaoAluguel(prof)}
                      className="p-1.5 rounded-lg text-forest-400 hover:text-forest hover:bg-sand/20 transition-colors"
                      title="Editar valor"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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
