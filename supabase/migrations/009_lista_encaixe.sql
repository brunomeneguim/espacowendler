CREATE TABLE IF NOT EXISTS lista_encaixe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_nome   TEXT NOT NULL,
  telefone        TEXT,
  observacoes     TEXT,
  profissional_id UUID REFERENCES profissionais(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE lista_encaixe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lista_encaixe_select" ON lista_encaixe FOR SELECT TO authenticated USING (true);
CREATE POLICY "lista_encaixe_insert" ON lista_encaixe FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lista_encaixe_update" ON lista_encaixe FOR UPDATE TO authenticated USING (true);
CREATE POLICY "lista_encaixe_delete" ON lista_encaixe FOR DELETE TO authenticated USING (true);
