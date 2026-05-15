ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS valor_plano_especial NUMERIC(10,2);
