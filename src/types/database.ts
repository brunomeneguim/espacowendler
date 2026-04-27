export type UserRole = "admin" | "supervisor" | "profissional" | "secretaria";

export type AgendamentoStatus =
  | "agendado"
  | "confirmado"
  | "realizado"
  | "cancelado"
  | "faltou";

export interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  role: UserRole;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Especialidade {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export interface Profissional {
  id: string;
  profile_id: string;
  registro_profissional: string | null;
  valor_consulta: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Profile;
  especialidades?: Especialidade[]; // via profissional_especialidades
}

export interface HorarioDisponivel {
  id: string;
  profissional_id: string;
  dia_semana: number; // 0 = domingo, 6 = sábado
  hora_inicio: string; // "09:00"
  hora_fim: string; // "18:00"
  created_at: string;
}

export interface Paciente {
  id: string;
  nome_completo: string;
  email: string | null;
  telefone: string;
  cpf: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agendamento {
  id: string;
  profissional_id: string;
  paciente_id: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  status: AgendamentoStatus;
  observacoes: string | null;
  criado_por: string | null;
  notificacao_email_enviada: boolean;
  notificacao_whatsapp_enviada: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  profissional?: Profissional;
  paciente?: Paciente;
}
