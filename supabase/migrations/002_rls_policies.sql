-- =============================================================
-- 002_rls_policies.sql — espaçowendler
-- Row Level Security em todas as tabelas
-- =============================================================

-- -------------------------------------------------------
-- Habilitar RLS
-- -------------------------------------------------------
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE especialidades     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais      ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios_disponiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos       ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- Helper: role do usuário autenticado
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_profissional_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM profissionais WHERE profile_id = auth.uid();
$$;

-- =============================================================
-- profiles
-- =============================================================
-- Leitura: admin e supervisor veem todos; secretaria vê todos; profissional vê apenas o próprio
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    current_user_role() IN ('admin', 'supervisor', 'secretaria')
    OR id = auth.uid()
  );

-- Inserção: apenas o próprio usuário (via trigger handle_new_user que usa SECURITY DEFINER)
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Atualização: admin edita todos; profissional edita apenas o próprio
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    current_user_role() = 'admin'
    OR id = auth.uid()
  )
  WITH CHECK (
    current_user_role() = 'admin'
    OR id = auth.uid()
  );

-- Exclusão: somente admin
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (current_user_role() = 'admin');

-- =============================================================
-- especialidades
-- =============================================================
CREATE POLICY "especialidades_select" ON especialidades FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "especialidades_insert" ON especialidades FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "especialidades_update" ON especialidades FOR UPDATE
  USING (current_user_role() = 'admin');

CREATE POLICY "especialidades_delete" ON especialidades FOR DELETE
  USING (current_user_role() = 'admin');

-- =============================================================
-- profissionais
-- =============================================================
CREATE POLICY "profissionais_select" ON profissionais FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "profissionais_insert" ON profissionais FOR INSERT
  WITH CHECK (current_user_role() IN ('admin', 'supervisor'));

CREATE POLICY "profissionais_update" ON profissionais FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'supervisor')
    OR profile_id = auth.uid()
  );

CREATE POLICY "profissionais_delete" ON profissionais FOR DELETE
  USING (current_user_role() IN ('admin', 'supervisor'));

-- =============================================================
-- horarios_disponiveis
-- =============================================================
CREATE POLICY "horarios_select" ON horarios_disponiveis FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "horarios_insert" ON horarios_disponiveis FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'supervisor')
    OR profissional_id = current_profissional_id()
  );

CREATE POLICY "horarios_update" ON horarios_disponiveis FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'supervisor')
    OR profissional_id = current_profissional_id()
  );

CREATE POLICY "horarios_delete" ON horarios_disponiveis FOR DELETE
  USING (
    current_user_role() IN ('admin', 'supervisor')
    OR profissional_id = current_profissional_id()
  );

-- =============================================================
-- pacientes
-- =============================================================
-- admin, supervisor, secretaria: acesso total
-- profissional: apenas pacientes com agendamentos vinculados a ele
CREATE POLICY "pacientes_select" ON pacientes FOR SELECT
  USING (
    current_user_role() IN ('admin', 'supervisor', 'secretaria')
    OR EXISTS (
      SELECT 1 FROM agendamentos a
      WHERE a.paciente_id = pacientes.id
        AND a.profissional_id = current_profissional_id()
    )
  );

CREATE POLICY "pacientes_insert" ON pacientes FOR INSERT
  WITH CHECK (current_user_role() IN ('admin', 'supervisor', 'secretaria'));

CREATE POLICY "pacientes_update" ON pacientes FOR UPDATE
  USING (current_user_role() IN ('admin', 'supervisor', 'secretaria'));

CREATE POLICY "pacientes_delete" ON pacientes FOR DELETE
  USING (current_user_role() IN ('admin', 'supervisor'));

-- =============================================================
-- agendamentos
-- =============================================================
-- admin, supervisor, secretaria: acesso total
-- profissional: apenas seus próprios agendamentos
CREATE POLICY "agendamentos_select" ON agendamentos FOR SELECT
  USING (
    current_user_role() IN ('admin', 'supervisor', 'secretaria')
    OR profissional_id = current_profissional_id()
  );

CREATE POLICY "agendamentos_insert" ON agendamentos FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'supervisor', 'secretaria')
    OR profissional_id = current_profissional_id()
  );

CREATE POLICY "agendamentos_update" ON agendamentos FOR UPDATE
  USING (
    current_user_role() IN ('admin', 'supervisor', 'secretaria')
    OR profissional_id = current_profissional_id()
  );

CREATE POLICY "agendamentos_delete" ON agendamentos FOR DELETE
  USING (current_user_role() IN ('admin', 'supervisor', 'secretaria'));
