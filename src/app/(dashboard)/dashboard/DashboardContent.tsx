"use client";

import { useState } from "react";
import { ListaEncaixe } from "./ListaEncaixe";
import { CalendarioSemanal } from "./CalendarioSemanal";

export interface ReagendarInfo {
  pacienteId?: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  encaixeId?: string;
}

interface Encaixe {
  id: string;
  paciente_nome: string;
  telefone: string | null;
  observacoes: string | null;
  profissional_id: string | null;
  created_at: string;
  profissional?: { profile: { nome_completo: string } | null } | null;
}

interface Props {
  encaixes: Encaixe[];
  calProps: Omit<React.ComponentProps<typeof CalendarioSemanal>, "reagendarInfo" | "onSetReagendarInfo" | "onAddEncaixe" | "onRemoveEncaixe">;
}

export function DashboardContent({ encaixes: initialEncaixes, calProps }: Props) {
  const [reagendarInfo, setReagendarInfo] = useState<ReagendarInfo | null>(null);
  const [encaixes, setEncaixes] = useState<Encaixe[]>(initialEncaixes);

  function handleAddEncaixe(enc: Encaixe) {
    setEncaixes(prev => [...prev, enc]);
  }

  function handleRemoveEncaixe(id: string) {
    setEncaixes(prev => prev.filter(e => e.id !== id));
  }

  return (
    <>
      <ListaEncaixe
        encaixes={encaixes}
        profissionais={calProps.profissionais as any}
        onReagendar={setReagendarInfo}
      />
      <CalendarioSemanal
        {...calProps}
        reagendarInfo={reagendarInfo}
        onSetReagendarInfo={setReagendarInfo}
        onAddEncaixe={handleAddEncaixe}
        onRemoveEncaixe={handleRemoveEncaixe}
      />
    </>
  );
}
