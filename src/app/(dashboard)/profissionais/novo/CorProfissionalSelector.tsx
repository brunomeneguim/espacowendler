"use client";

import { useState, useRef, useEffect } from "react";
import { PROF_CORES } from "@/lib/profCores";
import { ChevronDown, Check } from "lucide-react";

export function CorProfissionalSelector({ coresUsadas }: { coresUsadas: string[] }) {
  const [cor, setCor] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const corAtual = PROF_CORES.find(c => c.id === cor);

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
            <span className="w-5 h-5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: corAtual.hex }} />
            <span className="flex-1 text-forest">{corAtual.label}</span>
          </>
        ) : (
          <span className="flex-1 text-forest-400">Selecione uma cor…</span>
        )}
        <ChevronDown className={`w-4 h-4 text-forest-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-sand/40 rounded-xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 gap-0.5 p-2 max-h-64 overflow-y-auto">
            {PROF_CORES.map(c => {
              const usada = coresUsadas.includes(c.id);
              const selecionada = cor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={usada}
                  onClick={() => { setCor(c.id); setOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left
                    ${usada ? "opacity-40 cursor-not-allowed" : "hover:bg-sand/20 cursor-pointer"}
                    ${selecionada ? "bg-forest/5 font-medium" : ""}
                  `}
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 border border-white shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="flex-1 truncate text-forest">{c.label}</span>
                  {usada && <span className="text-[10px] text-forest-400">Em uso</span>}
                  {selecionada && <Check className="w-3.5 h-3.5 text-forest shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!cor && (
        <p className="text-xs text-forest-400 mt-1">Cada profissional deve ter uma cor única.</p>
      )}
    </div>
  );
}
