-- Adiciona todos os campos completos do perfil profissional
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS foto_url          TEXT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS data_nascimento   DATE;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS sexo              TEXT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS cpf               TEXT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS cnpj              TEXT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS horario_inicio    TIME;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS horario_fim       TIME;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS tempo_atendimento INT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS cor               TEXT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS observacoes       TEXT;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS data_cadastro     DATE;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS perfil_completo   BOOLEAN NOT NULL DEFAULT FALSE;
