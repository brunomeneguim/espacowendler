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
  // ListaEncaixe props
  encaixes: Encaixe[];
  // CalendarioSemanal props (forwarded as-is)
  calProps: Omit<React.ComponentProps<typeof CalendarioSemanal>, "reagendarInfo" | "onSetReagendarInfo">;
}

export function DashboardContent({ encaixes, calProps }: Props) {
  const [reagendarInfo, setReagendarInfo] = useState<ReagendarInfo | null>(null);

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
      />
    </>
  );
}
