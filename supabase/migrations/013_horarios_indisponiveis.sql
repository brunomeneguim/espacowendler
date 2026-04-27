-- Horários indisponíveis: períodos em que o profissional NÃO pode atender
CREATE TABLE IF NOT EXISTS horarios_indisponiveis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE horarios_indisponiveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados podem ver horarios_indisponiveis" ON horarios_indisponiveis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin e supervisor gerenciam horarios_indisponiveis" ON horarios_indisponiveis
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
  );
