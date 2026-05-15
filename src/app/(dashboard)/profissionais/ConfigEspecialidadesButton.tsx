"use client";

import { useState, useTransition } from "react";
import { BookOpen, X, Plus, Trash2, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { adicionarEspecialidade, removerEspecialidade } from "./actions";

interface Especialidade { id: number; nome: string }
interface Props { especialidades: Especialidade[] }

export function ConfigEspecialidadesButton({ especialidades: inicial }: Props) {
  const [open, setOpen] = useState(false);
  const [lista, setLista] = useState<Especialidade[]>(inicial);
  const [nova, setNova] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleAdd() {
    if (!nova.trim()) return;
    setErro(null);
    startTransition(async () => {
      const res = await adicionarEspecialidade(nova.trim());
      if (res.error) { setErro(res.error); return; }
      if (res.data) {
        setLista(prev => [...prev, res.data!].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNova("");
      }
    });
  }

  function handleRemove(id: number) {
    startTransition(async () => {
      const res = await removerEspecialidade(id);
      if (res.error) { setErro(res.error); return; }
      setLista(prev => prev.filter(e => e.id !== id));
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-sand/40 hover:bg-sand/20 text-forest-500 hover:text-forest transition-colors"
        title="Gerenciar especialidades"
      >
        <BookOpen className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand/30 bg-cream/60">
              <div>
                <p className="text-xs uppercase tracking-wider text-forest-500">Cadastros</p>
                <p className="font-display text-lg text-forest">Especialidades</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-forest/10 text-forest-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 border-b border-sand/20">
              <p className="text-sm text-forest-500 mb-3">
                Adicione as especialidades que aparecerão no cadastro de profissionais.
              </p>
              <ErrorBanner message={erro} />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nova}
                  onChange={e => setNova(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="Nova especialidade…"
                  className="input-field flex-1 py-2 text-sm"
                />
                <button
                  onClick={handleAdd}
                  disabled={isPending || !nova.trim()}
                  className="btn-primary px-3 flex items-center gap-1 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {lista.length === 0 ? (
                <p className="text-sm text-forest-400 text-center py-8">Nenhuma especialidade cadastrada.</p>
              ) : (
                <div className="space-y-1">
                  {lista.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-sand/20 last:border-0">
                      <span className="text-sm text-forest-700">{e.nome}</span>
                      <button
                        onClick={() => handleRemove(e.id)}
                        disabled={isPending}
                        className="p-1.5 text-rust hover:bg-rust/10 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
