-- Renomear sala "Online em casa" → "Online Home Office"
UPDATE salas SET nome = 'Online Home Office' WHERE nome ILIKE '%online%';

-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  concluida boolean DEFAULT false NOT NULL,
  prioridade text DEFAULT 'normal' NOT NULL CHECK (prioridade IN ('baixa','normal','alta')),
  data_vencimento date,
  criado_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  atribuido_para uuid REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em timestamptz DEFAULT now() NOT NULL,
  concluida_em timestamptz
);

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth users tarefas" ON tarefas;
CREATE POLICY "auth users tarefas" ON tarefas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tabela de post-its
CREATE TABLE IF NOT EXISTS postits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conteudo text NOT NULL,
  cor text DEFAULT 'yellow' NOT NULL,
  criado_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE postits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth users postits" ON postits;
CREATE POLICY "auth users postits" ON postits FOR ALL TO authenticated USING (true) WITH CHECK (true);
