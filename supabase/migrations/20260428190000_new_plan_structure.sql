-- 20260428190000_new_plan_structure.sql

-- 1. Create 'free' plan if it doesn't exist
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, modulos)
VALUES ('Gratuito', 'free', 'Ideal para corretores independentes. CRM básico.', 0.00, '["crm", "dashboard"]')
ON CONFLICT (slug) DO UPDATE SET 
    nome = 'Gratuito',
    preco_mensal = 0.00,
    modulos = '["crm", "dashboard"]',
    descricao = 'Ideal para corretores independentes. CRM básico.';

-- 2. Update 'essencial' to be the intermediate plan with Bot
UPDATE public.planos 
SET 
    nome = 'Essencial',
    slug = 'essencial',
    preco_mensal = 99.00,
    modulos = '["crm", "dashboard", "bot"]',
    descricao = 'Para corretores que querem automação. CRM básico e Bot IA incluso.'
WHERE slug = 'essencial' OR slug = 'trial';

-- 3. Ensure 'profissional' and 'enterprise' have the bot
UPDATE public.planos 
SET 
    modulos = '["crm", "dashboard", "inventario", "bot"]'
WHERE slug = 'profissional';

UPDATE public.planos 
SET 
    modulos = '["crm", "dashboard", "inventario", "operacao", "locacao", "sistema", "bot"]'
WHERE slug = 'enterprise';

-- 4. Update check constraint on imobiliarias
ALTER TABLE public.imobiliarias DROP CONSTRAINT IF EXISTS imobiliarias_plano_check;
ALTER TABLE public.imobiliarias ADD CONSTRAINT imobiliarias_plano_check 
CHECK (plano IN ('free', 'essencial', 'profissional', 'enterprise', 'pro', 'premium'));

-- 5. Migrate any existing 'free' or 'pro' slugs to the new ones if needed
-- Actually, we'll keep 'pro' and 'premium' as aliases in the check constraint for backward compatibility.
