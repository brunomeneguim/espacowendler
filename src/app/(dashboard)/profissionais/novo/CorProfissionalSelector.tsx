"use client";

import { useState } from "react";
import { PROF_CORES } from "@/lib/profCores";

export function CorProfissionalSelector({ coresUsadas }: { coresUsadas: string[] }) {
  const [cor, setCor] = useState("");
  const disponiveis = PROF_CORES.filter(c => !coresUsadas.includes(c.id));

  return (
    <div>
      <input type="hidden" name="cor" value={cor} />
      <div className="flex flex-wrap gap-2 mt-1">
        {disponiveis.map(c => (
          <button
            key={c.id}
            type="button"
            title={c.label}
            onClick={() => setCor(c.id)}
            className={`w-8 h-8 rounded-full border-4 transition-all ${c.bg} ${cor === c.id ? "border-forest scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
          />
        ))}
      </div>
      {cor && (
        <p className="text-xs text-forest-500 mt-1">
          Selecionado: <span className="font-medium">{PROF_CORES.find(c => c.id === cor)?.label}</span>
        </p>
      )}
      {disponiveis.length === 0 && (
        <p className="text-xs text-rust mt-1">Todas as cores já estão em uso.</p>
      )}
    </div>
  );
}
