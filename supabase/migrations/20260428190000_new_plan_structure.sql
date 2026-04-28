-- 20260428190000_new_plan_structure.sql

-- 1. Upsert 'free' plan
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, modulos, limite_usuarios)
VALUES ('Gratuito', 'free', 'Ideal para corretores independentes. CRM básico.', 0.00, '["crm", "dashboard"]', 1)
ON CONFLICT (slug) DO UPDATE SET 
    nome = EXCLUDED.nome,
    preco_mensal = EXCLUDED.preco_mensal,
    modulos = EXCLUDED.modulos,
    descricao = EXCLUDED.descricao,
    limite_usuarios = EXCLUDED.limite_usuarios;

-- 2. Upsert 'essencial' plan (Intermediate)
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, modulos, limite_usuarios)
VALUES ('Essencial', 'essencial', 'Para corretores que querem automação. CRM básico e Bot IA incluso.', 50.00, '["crm", "dashboard", "bot"]', 1)
ON CONFLICT (slug) DO UPDATE SET 
    nome = EXCLUDED.nome,
    preco_mensal = EXCLUDED.preco_mensal,
    modulos = EXCLUDED.modulos,
    descricao = EXCLUDED.descricao,
    limite_usuarios = EXCLUDED.limite_usuarios;

-- 3. Upsert 'profissional' plan
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, modulos, limite_usuarios)
VALUES ('Profissional', 'profissional', 'Para pequenas equipes. CRM completo, Gestão de Inventário e Bot IA incluso.', 150.00, '["crm", "dashboard", "inventario", "bot"]', 5)
ON CONFLICT (slug) DO UPDATE SET 
    nome = EXCLUDED.nome,
    preco_mensal = EXCLUDED.preco_mensal,
    modulos = EXCLUDED.modulos,
    descricao = EXCLUDED.descricao,
    limite_usuarios = EXCLUDED.limite_usuarios;

-- 4. Upsert 'enterprise' plan
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, modulos, limite_usuarios)
VALUES ('Enterprise', 'enterprise', 'Solução completa para imobiliárias. Todos os módulos e Bot IA avançado.', 450.00, '["crm", "dashboard", "inventario", "operacao", "locacao", "sistema", "bot"]', 20)
ON CONFLICT (slug) DO UPDATE SET 
    nome = EXCLUDED.nome,
    preco_mensal = EXCLUDED.preco_mensal,
    modulos = EXCLUDED.modulos,
    descricao = EXCLUDED.descricao,
    limite_usuarios = EXCLUDED.limite_usuarios;

-- 5. Update check constraint on imobiliarias
ALTER TABLE public.imobiliarias DROP CONSTRAINT IF EXISTS imobiliarias_plano_check;
ALTER TABLE public.imobiliarias ADD CONSTRAINT imobiliarias_plano_check 
CHECK (plano IN ('free', 'essencial', 'profissional', 'enterprise', 'pro', 'premium'));
