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
  // Adiciona itens novos que chegaram do servidor mas não estão no estado atual
  useEffect(() => {
    setEncaixes(prev => {
      const ids = new Set(prev.map(e => e.id));
      const novos = initialEncaixes.filter(e => !ids.has(e.id));
      return novos.length > 0 ? [...prev, ...novos] : prev;
    });
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

  return (
    <>
      <ListaEncaixe
        encaixes={encaixes}
        profissionais={calProps.profissionais as any}
        onReagendar={setReagendarInfo}
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
