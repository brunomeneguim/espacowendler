-- Adiciona campo de grupo para agendamentos recorrentes
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS recorrencia_grupo_id UUID;
CREATE INDEX IF NOT EXISTS idx_agendamentos_grupo ON agendamentos(recorrencia_grupo_id);
