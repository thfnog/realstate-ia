-- Script to upgrade Martinatti Imobiliária to Premium/Enterprise and set User as Master

-- 1. Add 'master' to user_role enum if it doesn't exist
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE directly in a block, 
-- but we can use a trick or just run it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'master') THEN
        ALTER TYPE user_role ADD VALUE 'master';
    END IF;
END $$;

-- 2. Upgrade Imobiliaria and User
DO $$
DECLARE
    v_imob_id UUID := 'c29bdff8-a01f-4406-8e0a-18536bd2dc88';
    v_user_id UUID := '60f1314e-1083-48db-bc45-04d98f657efa';
    v_plano_id UUID;
BEGIN
    -- Update Imobiliaria legacy plan field
    UPDATE public.imobiliarias 
    SET plano = 'premium' 
    WHERE id = v_imob_id;

    -- Get Enterprise plan ID
    SELECT id INTO v_plano_id FROM public.planos WHERE slug = 'enterprise';

    -- Create or update subscription
    INSERT INTO public.assinaturas (tenant_id, plano_id, status)
    VALUES (v_imob_id, v_plano_id, 'ativo')
    ON CONFLICT (tenant_id) DO UPDATE 
    SET plano_id = v_plano_id, status = 'ativo';

    -- Update User to Master
    UPDATE public.usuarios
    SET role = 'master'
    WHERE id = v_user_id;

END $$;
