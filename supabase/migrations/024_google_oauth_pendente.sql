-- =============================================================
-- 024_google_oauth_pendente.sql
-- Adiciona role 'pendente' para usuários auto-cadastrados via Google OAuth
-- Adiciona coluna avatar_url nos profiles
-- Atualiza trigger handle_new_user para suportar metadados do Google
-- =============================================================

-- 1. Novo valor no enum (idempotente)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'pendente';

-- 2. Coluna avatar_url no profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Trigger atualizado
--    • 1º usuário ever         → admin
--    • Criado via admin API    → pendente (admin atualizará o role logo em seguida)
--    • Auto-cadastro (email ou Google) → pendente (aguarda aprovação do admin)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role user_role;
  v_nome TEXT;
BEGIN
  -- Primeiro usuário do sistema vira admin automaticamente
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := 'pendente';
  END IF;

  -- Resolve nome: tenta os campos dos provedores mais comuns
  v_nome := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'nome_completo'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NEW.email
  );

  INSERT INTO profiles (id, role, nome_completo, email, avatar_url)
  VALUES (
    NEW.id,
    v_role,
    v_nome,
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
