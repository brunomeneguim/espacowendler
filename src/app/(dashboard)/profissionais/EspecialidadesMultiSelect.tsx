"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AddEspecialidadeButton } from "./AddEspecialidadeButton";

interface Especialidade { id: number; nome: string }

interface Props {
  especialidades: Especialidade[];
  selecionadas: number[];
  onChange: (ids: number[]) => void;
  onEspecialidadeAdded: (esp: Especialidade) => void;
}

export function EspecialidadesMultiSelect({ especialidades, selecionadas, onChange, onEspecialidadeAdded }: Props) {
  const [selectValue, setSelectValue] = useState("");

  const disponiveis = especialidades.filter(e => !selecionadas.includes(e.id));

  function add(id: number) {
    if (id && !selecionadas.includes(id)) onChange([...selecionadas, id]);
    setSelectValue("");
  }

  function remove(id: number) {
    onChange(selecionadas.filter(s => s !== id));
  }

  return (
    <div className="space-y-2">
      {/* Hidden inputs para o FormData */}
      {selecionadas.map(id => (
        <input key={id} type="hidden" name="especialidade_ids" value={id} />
      ))}

      {/* Pills das especialidades selecionadas */}
      {selecionadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selecionadas.map(id => {
            const esp = especialidades.find(e => e.id === id);
            if (!esp) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-forest/10 text-forest text-sm rounded-lg"
              >
                {esp.nome}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="text-forest-400 hover:text-rust transition-colors ml-0.5"
                  title={`Remover ${esp.nome}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown para adicionar + botão nova especialidade */}
      <div className="flex items-center gap-2">
        <select
          className="input-field flex-1"
          value={selectValue}
          onChange={e => {
            const id = parseInt(e.target.value);
            if (id) add(id);
          }}
        >
          <option value="">
            {disponiveis.length === 0 ? "Todas adicionadas" : "Adicionar especialidade…"}
          </option>
          {disponiveis.map(e => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
        <AddEspecialidadeButton
          onAdded={esp => {
            onEspecialidadeAdded(esp);
            add(esp.id);
          }}
        />
      </div>

      {selecionadas.length === 0 && (
        <p className="text-xs text-forest-400">Nenhuma especialidade selecionada.</p>
      )}
    </div>
  );
}
