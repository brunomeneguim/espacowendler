-- =============================================================
-- 023_rls_paciente_profissional.sql
-- Adiciona RLS e policies que faltavam na tabela paciente_profissional
-- e lembretes_aniversario (criadas na 015 sem cobertura de segurança).
-- =============================================================

-- ── paciente_profissional ────────────────────────────────────────────────────
ALTER TABLE paciente_profissional ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado pode ver os vínculos
CREATE POLICY "paciente_profissional_select"
  ON paciente_profissional FOR SELECT
  TO authenticated
  USING (true);

-- Escrita (insert/update/delete): admin, supervisor e secretaria
CREATE POLICY "paciente_profissional_insert"
  ON paciente_profissional FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'supervisor', 'secretaria')
    )
  );

CREATE POLICY "paciente_profissional_delete"
  ON paciente_profissional FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'supervisor', 'secretaria')
    )
  );

-- ── lembretes_aniversario ────────────────────────────────────────────────────
ALTER TABLE lembretes_aniversario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lembretes_aniversario_select"
  ON lembretes_aniversario FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "lembretes_aniversario_insert"
  ON lembretes_aniversario FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'supervisor', 'secretaria')
    )
  );

CREATE POLICY "lembretes_aniversario_update"
  ON lembretes_aniversario FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'supervisor', 'secretaria')
    )
  );

CREATE POLICY "lembretes_aniversario_delete"
  ON lembretes_aniversario FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'supervisor', 'secretaria')
    )
  );
