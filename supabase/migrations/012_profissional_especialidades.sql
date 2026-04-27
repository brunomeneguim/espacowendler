-- Tabela de junção: profissional ↔ especialidades (N:N)
CREATE TABLE IF NOT EXISTS profissional_especialidades (
  id          SERIAL PRIMARY KEY,
  profissional_id UUID    NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  especialidade_id INTEGER NOT NULL REFERENCES especialidades(id) ON DELETE CASCADE,
  UNIQUE (profissional_id, especialidade_id)
);

-- RLS: mesmas regras da tabela profissionais
ALTER TABLE profissional_especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler profissional_especialidades"
  ON profissional_especialidades FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins/supervisores gerenciam profissional_especialidades"
  ON profissional_especialidades FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'supervisor')
    )
  );

-- Migrar dados existentes do campo especialidade_id para a nova tabela
INSERT INTO profissional_especialidades (profissional_id, especialidade_id)
SELECT id, especialidade_id
FROM profissionais
WHERE especialidade_id IS NOT NULL
ON CONFLICT DO NOTHING;
