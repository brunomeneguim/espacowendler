"use client";

import { useState, useRef, useEffect } from "react";
import { PROF_CORES } from "@/lib/profCores";
import { ChevronDown } from "lucide-react";

export function CorProfissionalSelector({
  coresUsadas,
  defaultCor,
}: {
  coresUsadas: string[];
  defaultCor?: string;
}) {
  const [cor, setCor] = useState(defaultCor ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const corAtual = PROF_CORES.find(c => c.id === cor);
  // Apenas cores ainda não usadas (exceto a atual, que pertence a este profissional)
  const coresDisponiveis = PROF_CORES.filter(c => !coresUsadas.includes(c.id) || c.id === cor);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="cor" value={cor} />

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="input-field flex items-center gap-3 text-left w-full"
      >
        {corAtual ? (
          <>
            <span
              className="w-5 h-5 rounded-full shrink-0 border border-white shadow-sm"
              style={{ backgroundColor: corAtual.hex }}
            />
            <span className="flex-1 text-forest">{corAtual.label}</span>
          </>
        ) : (
          <span className="flex-1 text-forest-400">Selecione uma cor…</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-forest-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Paleta de cores */}
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-sand/40 rounded-xl shadow-xl p-3 min-w-[200px]">
          <p className="text-[10px] font-semibold text-forest-400 uppercase tracking-wider mb-2">
            Cores disponíveis
          </p>
          <div className="grid grid-cols-8 gap-1.5">
            {coresDisponiveis.map(c => {
              const selecionada = cor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => { setCor(c.id); setOpen(false); }}
                  className="relative w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{ backgroundColor: c.hex }}
                >
                  {selecionada && (
                    <span className="absolute inset-0 rounded-full ring-2 ring-white ring-offset-1"
                      style={{ boxShadow: `0 0 0 2px ${c.hex}` }} />
                  )}
                </button>
              );
            })}
          </div>
          {coresDisponiveis.length === 0 && (
            <p className="text-xs text-forest-400 text-center py-2">
              Todas as cores já estão em uso.
            </p>
          )}
        </div>
      )}

      {!cor && (
        <p className="text-xs text-forest-400 mt-1">Cada profissional deve ter uma cor única.</p>
      )}
    </div>
  );
}
