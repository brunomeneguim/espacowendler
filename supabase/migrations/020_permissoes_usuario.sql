CREATE TABLE IF NOT EXISTS permissoes_usuario (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pagina text NOT NULL,
  pode_ver boolean NOT NULL DEFAULT true,
  pode_editar boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, pagina)
);

ALTER TABLE permissoes_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam todas as permissoes"
  ON permissoes_usuario FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Usuarios leem proprias permissoes"
  ON permissoes_usuario FOR SELECT
  USING (profile_id = auth.uid());
