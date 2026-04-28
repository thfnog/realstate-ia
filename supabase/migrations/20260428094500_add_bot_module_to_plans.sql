-- 20260428094500_add_bot_module_to_plans.sql

-- Update Essencial (Basic)
UPDATE public.planos 
SET 
    descricao = 'Ideal para corretores independentes. CRM básico e Bot IA com WhatsApp incluso.',
    modulos = '["crm", "dashboard", "bot"]'
WHERE slug = 'essencial' OR slug = 'free';

-- Update Profissional
UPDATE public.planos 
SET 
    descricao = 'Para pequenas equipes. CRM completo, Gestão de Inventário e Bot IA incluso.',
    modulos = '["crm", "dashboard", "inventario", "bot"]'
WHERE slug = 'profissional';

-- Update Enterprise
UPDATE public.planos 
SET 
    descricao = 'Solução completa para imobiliárias. Todos os módulos e Bot IA avançado.',
    modulos = '["crm", "dashboard", "inventario", "operacao", "locacao", "sistema", "bot"]'
WHERE slug = 'enterprise';
