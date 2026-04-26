-- Add telefone to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Add valor_plano to profissionais table
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS valor_plano NUMERIC(10,2);

-- Add tipo_agendamento to agendamentos table
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tipo_agendamento TEXT NOT NULL DEFAULT 'consulta_avulsa'
  CHECK (tipo_agendamento IN ('consulta_avulsa', 'plano_mensal', 'ausencia'));
