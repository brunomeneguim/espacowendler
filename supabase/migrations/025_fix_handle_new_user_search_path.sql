-- =============================================================
-- 025_fix_handle_new_user_search_path.sql
-- Corrige "type user_role does not exist" ao cadastrar via Google OAuth.
-- O trigger SECURITY DEFINER roda sem search_path e não encontra
-- public.user_role. Solução: definir SET search_path = public na função.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_nome TEXT;
BEGIN
  -- Primeiro usuário do sistema vira admin automaticamente
  IF (SELECT COUNT(*) FROM public.profiles) = 0 THEN
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

  INSERT INTO public.profiles (id, role, nome_completo, email, avatar_url)
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
