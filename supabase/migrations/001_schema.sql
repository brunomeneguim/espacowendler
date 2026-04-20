-- =============================================================
-- 001_schema.sql — espaçowendler
-- Schema principal: enums, tabelas, índices, triggers
-- =============================================================

-- -------------------------------------------------------
-- Enums
-- -------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'profissional', 'secretaria');
CREATE TYPE agendamento_status AS ENUM ('agendado', 'confirmado', 'realizado', 'cancelado', 'faltou');

-- -------------------------------------------------------
-- Helper: updated_at automático
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------
-- profiles (extensão de auth.users)
-- -------------------------------------------------------
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'profissional',
  nome_completo   TEXT NOT NULL,
  email           TEXT NOT NULL,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: primeiro usuário vira admin automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
BEGIN
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := 'profissional';
  END IF;

  INSERT INTO profiles (id, role, nome_completo, email)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -------------------------------------------------------
-- especialidades
-- -------------------------------------------------------
CREATE TABLE especialidades (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed inicial
INSERT INTO especialidades (nome) VALUES
  ('Psicologia'),
  ('Medicina'),
  ('Nutrição'),
  ('Fisioterapia'),
  ('Fonoaudiologia'),
  ('Terapia Ocupacional');

-- -------------------------------------------------------
-- profissionais
-- -------------------------------------------------------
CREATE TABLE profissionais (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  especialidade_id      INT REFERENCES especialidades(id) ON DELETE SET NULL,
  registro_profissional TEXT,
  valor_consulta        NUMERIC(10, 2),
  ativo                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profissionais_updated_at
  BEFORE UPDATE ON profissionais
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- horarios_disponiveis
-- -------------------------------------------------------
CREATE TABLE horarios_disponiveis (
  id              SERIAL PRIMARY KEY,
  profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  dia_semana      SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio     TIME NOT NULL,
  hora_fim        TIME NOT NULL,
  CONSTRAINT chk_hora_fim_apos_inicio CHECK (hora_fim > hora_inicio),
  UNIQUE (profissional_id, dia_semana, hora_inicio)
);

-- -------------------------------------------------------
-- pacientes
-- -------------------------------------------------------
CREATE TABLE pacientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo   TEXT NOT NULL,
  telefone        TEXT,
  email           TEXT,
  cpf             TEXT UNIQUE,
  data_nascimento DATE,
  observacoes     TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- agendamentos
-- -------------------------------------------------------
CREATE TABLE agendamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id  UUID NOT NULL REFERENCES profissionais(id) ON DELETE RESTRICT,
  paciente_id      UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim    TIMESTAMPTZ NOT NULL,
  status           agendamento_status NOT NULL DEFAULT 'agendado',
  observacoes      TEXT,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_fim_apos_inicio CHECK (data_hora_fim > data_hora_inicio)
);

CREATE TRIGGER trg_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índice único parcial: evita conflito de horário para agendamentos ativos
CREATE UNIQUE INDEX idx_agendamentos_sem_conflito
  ON agendamentos (profissional_id, data_hora_inicio)
  WHERE status IN ('agendado', 'confirmado');
