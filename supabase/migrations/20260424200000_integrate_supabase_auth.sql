-- ========================================================
-- VERSÃO ROBUSTA: INTEGRAÇÃO SUPABASE AUTH
-- ========================================================

-- 1. Garantir colunas necessárias
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE public.usuarios ALTER COLUMN hash_senha DROP NOT NULL;

-- 2. Função de Trigger Otimizada
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger AS $$
DECLARE
    meta_imob_id UUID;
    meta_role user_role;
    meta_corretor_id UUID;
BEGIN
    -- Extrair metadados com segurança
    meta_imob_id := (new.raw_user_meta_data->>'imobiliaria_id')::UUID;
    meta_role := COALESCE((new.raw_user_meta_data->>'role')::user_role, 'corretor');
    meta_corretor_id := (new.raw_user_meta_data->>'corretor_id')::UUID;

    -- Tentar vincular pelo e-mail se o perfil já foi pré-criado
    -- Usamos UPSERT para evitar erros de concorrência ou detecção
    INSERT INTO public.usuarios (id, auth_id, email, imobiliaria_id, role, corretor_id)
    VALUES (new.id, new.id, new.email, meta_imob_id, meta_role, meta_corretor_id)
    ON CONFLICT (email) DO UPDATE
    SET auth_id = EXCLUDED.auth_id,
        -- Apenas atualiza o ID da tabela pública para bater com o do Auth se for um novo vínculo
        id = CASE WHEN public.usuarios.auth_id IS NULL THEN EXCLUDED.id ELSE public.usuarios.id END;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_created();

-- 4. Ajuste de RLS (Garantir que a trigger tenha permissão total)
ALTER FUNCTION public.handle_auth_user_created() OWNER TO postgres;
