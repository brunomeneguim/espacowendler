-- ── Fix #3: ON DELETE CASCADE for agendamentos FKs ─────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'agendamentos'::regclass
      AND conname IN ('agendamentos_paciente_id_fkey','agendamentos_profissional_id_fkey')
  LOOP
    EXECUTE 'ALTER TABLE agendamentos DROP CONSTRAINT ' || r.conname;
  END LOOP;
END $$;

ALTER TABLE agendamentos
  ADD CONSTRAINT agendamentos_paciente_id_fkey
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE;

ALTER TABLE agendamentos
  ADD CONSTRAINT agendamentos_profissional_id_fkey
    FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE;

-- ── Patient–Professional junction table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS paciente_profissional (
  id            BIGSERIAL PRIMARY KEY,
  paciente_id   UUID NOT NULL REFERENCES pacientes(id)     ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (paciente_id, profissional_id)
);

-- ── New columns on pacientes ────────────────────────────────────────────────
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS inicio_tratamento      DATE,
  ADD COLUMN IF NOT EXISTS resp_fin_mesmo_paciente BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS resp_fin_nome           TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_email          TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_cpf            TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_parentesco     TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_telefone       TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_ddi            TEXT DEFAULT '+55',
  ADD COLUMN IF NOT EXISTS resp_fin_mesmo_endereco BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS resp_fin_cep            TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_estado         TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_cidade         TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_bairro         TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_logradouro     TEXT,
  ADD COLUMN IF NOT EXISTS resp_fin_numero         TEXT;

-- ── Birthday reminders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lembretes_aniversario (
  id          BIGSERIAL PRIMARY KEY,
  paciente_id UUID    NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  ano         INTEGER NOT NULL,
  concluida   BOOLEAN DEFAULT false,
  concluida_em TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (paciente_id, ano)
);
