-- Adiciona 'ausencia' ao enum de status de agendamento
ALTER TYPE agendamento_status ADD VALUE IF NOT EXISTS 'ausencia';

-- Torna paciente_id nullable (ausências não têm paciente)
ALTER TABLE agendamentos ALTER COLUMN paciente_id DROP NOT NULL;
