-- Adiciona campos de telefone ao cadastro de profissionais
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS telefone_1 TEXT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS telefone_2 TEXT;
