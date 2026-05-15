"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, Pencil, Check, X, Loader2, CreditCard, ToggleLeft, ToggleRight, GripVertical, Trash2 } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { criarMetodo, atualizarMetodo, reordenarMetodos, excluirMetodo } from "./actions";

interface Metodo {
  id: number;
  valor: string;
  label: string;
  ativo: boolean;
  ordem: number;
}

export function MetodosPagamentoClient({ metodosIniciais }: { metodosIniciais: Metodo[] }) {
  const [isPending, startTransition] = useTransition();
  const [metodos, setMetodos] = useState<Metodo[]>(
    [...metodosIniciais].sort((a, b) => a.ordem - b.ordem)
  );
  const [erro, setErro] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  // ── Novo método ──
  const [showForm, setShowForm] = useState(false);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [formErro, setFormErro] = useState<string | null>(null);

  // ── Edição inline ──
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editErro, setEditErro] = useState<string | null>(null);

  function handleNovoValorChange(v: string) {
    setNovoValor(v.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  }

  function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setFormErro(null);
    startTransition(async () => {
      const res = await criarMetodo(novoValor, novoLabel);
      if (res.error) { setFormErro(res.error); return; }
      setMetodos(prev => [
        ...prev,
        { id: Date.now(), valor: novoValor, label: novoLabel, ativo: true, ordem: prev.length },
      ]);
      setNovoLabel(""); setNovoValor(""); setShowForm(false);
    });
  }

  function iniciarEdicao(m: Metodo) {
    setEditandoId(m.id);
    setEditLabel(m.label);
    setEditErro(null);
  }

  function handleSalvarEdicao(m: Metodo) {
    if (!editLabel.trim()) { setEditErro("Label é obrigatório."); return; }
    setEditErro(null);
    startTransition(async () => {
      const res = await atualizarMetodo(m.id, editLabel, m.ativo);
      if (res.error) { setEditErro(res.error); return; }
      setMetodos(prev => prev.map(x => x.id === m.id ? { ...x, label: editLabel.trim() } : x));
      setEditandoId(null);
    });
  }

  function handleToggleAtivo(m: Metodo) {
    startTransition(async () => {
      const res = await atualizarMetodo(m.id, m.label, !m.ativo);
      if (res.error) { setErro(res.error); return; }
      setMetodos(prev => prev.map(x => x.id === m.id ? { ...x, ativo: !x.ativo } : x));
    });
  }

  function handleDragStart(idx: number) {
    dragIndexRef.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === idx) return;
    const next = [...metodos];
    const [removed] = next.splice(from, 1);
    next.splice(idx, 0, removed);
    next.forEach((m, i) => { m.ordem = i; });
    dragIndexRef.current = idx;
    setMetodos(next);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    startTransition(async () => {
      await reordenarMetodos(metodos.map(m => m.id));
    });
  }

  function handleExcluir(m: Metodo) {
    if (!confirm(`Excluir o método "${m.label}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const res = await excluirMetodo(m.id);
      if (res.error) { setErro(res.error); return; }
      setMetodos(prev => prev.filter(x => x.id !== m.id));
    });
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={erro} />

      {/* Tabela de métodos */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-sand/20 flex items-center justify-between">
          <p className="text-xs font-semibold text-forest-600 uppercase tracking-wider">
            Métodos ({metodos.length})
          </p>
          <button
            type="button"
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-forest text-white rounded-lg hover:bg-forest/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Novo método
          </button>
        </div>

        {/* Formulário de novo método */}
        {showForm && (
          <form onSubmit={handleCriar} className="px-5 py-4 bg-cream/40 border-b border-sand/20 space-y-3">
            {formErro && <p className="text-xs text-rust">{formErro}</p>}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-forest-600 mb-1 block">
                  Label <span className="text-rust">*</span>
                  <span className="ml-1 font-normal text-forest-400">(exibido para o usuário)</span>
                </label>
                <input
                  type="text"
                  value={novoLabel}
                  onChange={e => setNovoLabel(e.target.value)}
                  placeholder="ex: Pix, Dinheiro, Crédito…"
                  required
                  className="input-field py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-forest-600 mb-1 block">
                  Código/valor <span className="text-rust">*</span>
                  <span className="ml-1 font-normal text-forest-400">(único, somente letras/números)</span>
                </label>
                <input
                  type="text"
                  value={novoValor}
                  onChange={e => handleNovoValorChange(e.target.value)}
                  placeholder="ex: pix, dinheiro, credito"
                  required
                  className="input-field py-1.5 text-sm font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !novoLabel.trim() || !novoValor.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-forest text-white rounded-lg hover:bg-forest/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormErro(null); setNovoLabel(""); setNovoValor(""); }}
                className="px-4 py-1.5 text-sm text-forest-500 hover:text-forest border border-sand/40 rounded-lg hover:bg-sand/20 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <ul className="divide-y divide-sand/20">
          {metodos.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-forest-400">
              Nenhum método cadastrado. Clique em "Novo método" para adicionar.
            </li>
          )}
          {metodos.map((m, idx) => (
            <li
              key={m.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 px-5 py-3 hover:bg-cream/30 transition-colors cursor-grab active:cursor-grabbing ${!m.ativo ? "opacity-50" : ""}`}
            >
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />

              {/* Icon */}
              <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-forest" strokeWidth={1.5} />
              </div>

              {/* Info / edit */}
              {editandoId === m.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="flex-1 input-field py-1 text-sm"
                    autoFocus
                  />
                  {editErro && <p className="text-xs text-rust">{editErro}</p>}
                  <button
                    type="button"
                    onClick={() => handleSalvarEdicao(m)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg bg-forest text-white hover:bg-forest/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoId(null)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forest">{m.label}</p>
                    <p className="text-xs text-forest-400 font-mono">{m.valor}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle ativo */}
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(m)}
                      disabled={isPending}
                      title={m.ativo ? "Desativar" : "Ativar"}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-forest-400 hover:text-forest disabled:opacity-50"
                    >
                      {m.ativo
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(m)}
                      className="p-1.5 rounded-lg hover:bg-forest/10 text-forest-400 hover:text-forest transition-colors"
                      title="Editar label"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(m)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Excluir método"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-forest-400">
        Os métodos ativos aparecerão nos formulários de pagamento da agenda. Arraste para reordenar.
      </p>
    </div>
  );
}
