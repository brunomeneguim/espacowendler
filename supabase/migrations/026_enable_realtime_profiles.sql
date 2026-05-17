-- =============================================================
-- 026_enable_realtime_profiles.sql
-- Habilita Supabase Realtime na tabela profiles para que a
-- página /aguardando detecte automaticamente quando o admin
-- aprova o usuário (role muda de "pendente" para outro valor).
-- =============================================================

-- Adiciona profiles à publicação de Realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
