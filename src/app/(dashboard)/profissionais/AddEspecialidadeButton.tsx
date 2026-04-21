"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Plus } from "lucide-react";
import { adicionarEspecialidade } from "./actions";

interface Props {
  onAdded: (esp: { id: number; nome: string }) => void;
}

export function AddEspecialidadeButton({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="p-1 rounded-lg hover:bg-forest/10 text-forest-400 hover:text-forest transition-colors"
        title="Adicionar especialidade"
      >
        <Plus className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-sand/40 rounded-xl shadow-xl p-3 w-56 space-y-2">
          <p className="text-xs font-medium text-forest">Nova especialidade</p>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              className="input-field text-sm"
              placeholder="Nome da especialidade"
              value={nome}
              onChange={e => setNome(e.target.value)}
              autoFocus
            />
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <button
              type="submit"
              disabled={isPending || !nome.trim()}
              className="w-full btn-primary text-xs py-1.5 disabled:opacity-50"
            >
              {isPending ? "Adicionando…" : "Adicionar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
