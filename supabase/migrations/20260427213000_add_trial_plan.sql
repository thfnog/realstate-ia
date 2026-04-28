-- 20260427213000_add_trial_plan.sql

-- 1. Inserir plano Trial (Gratuito)
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, modulos, limite_usuarios)
VALUES 
('Trial', 'trial', 'Ideal para testar a plataforma. 1 usuário, gestão de leads básica.', 0.00, '["crm", "dashboard"]', 1)
ON CONFLICT (slug) DO UPDATE SET 
    preco_mensal = EXCLUDED.preco_mensal,
    limite_usuarios = EXCLUDED.limite_usuarios,
    modulos = EXCLUDED.modulos;
