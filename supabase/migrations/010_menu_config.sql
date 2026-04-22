CREATE TABLE IF NOT EXISTS menu_config (
  id       SERIAL PRIMARY KEY,
  href     TEXT NOT NULL UNIQUE,
  label    TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  ordem    INT NOT NULL DEFAULT 0
);

-- Dados iniciais
INSERT INTO menu_config (href, label, icon_name, ordem) VALUES
  ('/dashboard',    'Agenda do dia',  'Calendar',    0),
  ('/pacientes',    'Pacientes',      'Users',        1),
  ('/profissionais','Profissionais',  'Stethoscope',  2),
  ('/tarefas',      'Tarefas',        'CheckSquare',  3),
  ('/equipe',       'Equipe',         'UserCircle',   4)
ON CONFLICT (href) DO NOTHING;

ALTER TABLE menu_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_config_select" ON menu_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "menu_config_update" ON menu_config FOR UPDATE TO authenticated USING (true);
