-- Remove coluna especialidade_id legada da tabela profissionais.
-- Os dados já foram migrados para profissional_especialidades (migration 012).
ALTER TABLE profissionais DROP COLUMN IF EXISTS especialidade_id;
