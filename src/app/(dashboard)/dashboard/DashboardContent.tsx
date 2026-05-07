"use client";

import { useState, useEffect } from "react";
import { ListaEncaixe } from "./ListaEncaixe";
import { CalendarioSemanal } from "./CalendarioSemanal";

export interface ReagendarInfo {
  pacienteId?: string;
  pacienteNome: string;
  profissionalId: string;
  profissionalNome: string;
  encaixeId?: string;
  // Dados do ag original para reagendamento automático (sem navegar ao formulário)
  salaId?: number | null;
  duracaoMin?: number;
  tipoAgendamento?: string;
  observacoes?: string | null;
}

export interface Encaixe {
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
  calProps: Omit<React.ComponentProps<typeof CalendarioSemanal>, "reagendarInfo" | "onSetReagendarInfo" | "onAddEncaixe" | "onRemoveEncaixe" | "encaixes">;
}

export function DashboardContent({ encaixes: initialEncaixes, calProps }: Props) {
  const [reagendarInfo, setReagendarInfo] = useState<ReagendarInfo | null>(null);
  // ── Único dono do estado de encaixe — tanto ListaEncaixe quanto CalendarioSemanal usam estes callbacks ──
  const [encaixes, setEncaixes] = useState<Encaixe[]>(initialEncaixes);

  // ── Sincroniza com dados frescos do servidor após router.refresh() ──
  // Substitui o estado inteiro para refletir adições E remoções vindas do servidor
  useEffect(() => {
    setEncaixes(initialEncaixes);
  }, [initialEncaixes]);

  function handleAddEncaixe(enc: Encaixe) {
    setEncaixes(prev => {
      // Evita duplicata por id
      if (prev.some(e => e.id === enc.id)) return prev;
      return [...prev, enc];
    });
  }

  function handleRemoveEncaixe(id: string) {
    setEncaixes(prev => prev.filter(e => e.id !== id));
  }

  function handleUpdateEncaixe(enc: Encaixe) {
    setEncaixes(prev => prev.map(e => e.id === enc.id ? enc : e));
  }

  // Enriquece reagendarInfo com pacienteId ao reagendar da lista de encaixe
  function handleReagendarFromEncaixe(info: ReagendarInfo) {
    const pacientes = calProps.pacientes as Array<{ id: string; nome_completo: string }>;
    const found = pacientes?.find(
      p => p.nome_completo.toLowerCase() === info.pacienteNome.toLowerCase()
    );
    setReagendarInfo({ ...info, pacienteId: found?.id ?? info.pacienteId });
  }

  return (
    <>
      <ListaEncaixe
        encaixes={encaixes}
        profissionais={calProps.profissionais as any}
        onReagendar={handleReagendarFromEncaixe}
        onAddEncaixe={handleAddEncaixe}
        onRemoveEncaixe={handleRemoveEncaixe}
        onUpdateEncaixe={handleUpdateEncaixe}
      />
      <CalendarioSemanal
        {...calProps}
        encaixes={encaixes}
        reagendarInfo={reagendarInfo}
        onSetReagendarInfo={setReagendarInfo}
        onAddEncaixe={handleAddEncaixe}
        onRemoveEncaixe={handleRemoveEncaixe}
      />
    </>
  );
}
