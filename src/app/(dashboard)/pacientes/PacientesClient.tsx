"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Pencil, Users, Plus, Phone, Mail } from "lucide-react";

interface Paciente {
  id: string;
  nome_completo: string;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  ativo: boolean;
}

interface Props {
  pacientes: Paciente[];
  canEdit: boolean;
}

export function PacientesClient({ pacientes, canEdit }: Props) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() =>
    pacientes.filter(p =>
      !busca || p.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      p.email?.toLowerCase().includes(busca.toLowerCase()) ||
      p.telefone?.includes(busca)
    ), [pacientes, busca]);

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forest-400" />
        <input
          type="text"
          placeholder="Buscar paciente por nome, e-mail ou telefone…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="input-field pl-9 h-9 text-sm"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 mx-auto mb-4 text-sand" strokeWidth={1} />
          <h3 className="font-display text-2xl text-forest mb-2">
            {busca ? "Nenhum resultado" : "Nenhum paciente cadastrado"}
          </h3>
          <p className="text-forest-600 mb-6">
            {busca ? "Nenhum paciente com esse nome." : "Cadastre o primeiro paciente para começar a agendar."}
          </p>
          {canEdit && !busca && (
            <Link href="/pacientes/novo" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Cadastrar paciente
            </Link>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-sand/20">
            {filtrados.map(p => (
              <li key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream/50 transition-colors">
                <div className="w-11 h-11 rounded-full bg-peach/40 text-rust flex items-center justify-center font-display text-lg shrink-0">
                  {p.nome_completo.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-forest truncate">{p.nome_completo}</p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-forest-600">
                    {p.telefone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />{p.telefone}
                      </span>
                    )}
                    {p.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{p.email}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <Link href={`/pacientes/${p.id}/editar`} className="shrink-0 p-2 rounded-lg hover:bg-forest/10 text-forest-500 hover:text-forest transition-colors" title="Editar paciente">
                    <Pencil className="w-4 h-4" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
