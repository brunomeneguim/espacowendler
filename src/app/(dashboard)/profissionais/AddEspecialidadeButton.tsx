"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { adicionarEspecialidade } from "./actions";

interface Props {
  onAdded: (esp: { id: number; nome: string }) => void;
}

export function AddEspecialidadeButton({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setErro(null);
    startTransition(async () => {
      const res = await adicionarEspecialidade(nome.trim());
      if (res.error) {
        setErro(res.error);
      } else if (res.data) {
        onAdded(res.data);
        setNome("");
        setOpen(false);
      }
    });
  }

  function handleClose() {
    setNome("");
    setErro(null);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1 rounded-lg hover:bg-forest/10 text-forest-400 hover:text-forest transition-colors shrink-0"
        title="Adicionar especialidade"
      >
        <Plus className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={handleClose} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <p className="font-display text-lg text-forest">Nova especialidade</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nome da especialidade"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  autoFocus
                />
                {erro && <p className="text-sm text-rust">{erro}</p>}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isPending || !nome.trim()}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Adicionando…</> : "Adicionar"}
                  </button>
                  <button type="button" onClick={handleClose} className="btn-ghost flex-1">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
