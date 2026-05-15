-- Card Financeiro no cadastro do paciente: valor de consulta especial
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS valor_consulta_especial NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sessoes_plano_especial  INT;

-- Quantidade de sessões cobertas no agendamento (ex: paciente paga 4 sessões de uma vez)
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS quantidade_sessoes INT NOT NULL DEFAULT 1;
