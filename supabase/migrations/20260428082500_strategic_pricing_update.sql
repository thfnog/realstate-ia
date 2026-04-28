-- 20260428082500_strategic_pricing_update.sql

-- 1. Atualizar planos existentes para a nova estratégia de preços e limites
-- Essencial -> Torna-se o plano gratuito (antigo Trial)
UPDATE public.planos 
SET 
    nome = 'Essencial',
    preco_mensal = 0.00,
    limite_usuarios = 1,
    descricao = 'Ideal para corretores independentes. 1 usuário e CRM básico.'
WHERE slug = 'essencial';

-- Profissional -> Novo valor acessível com mais entrega
UPDATE public.planos 
SET 
    nome = 'Profissional',
    preco_mensal = 199.00,
    limite_usuarios = 5,
    descricao = 'Para pequenas equipes. 5 usuários, CRM completo e Gestão de Inventário.',
    modulos = '["crm", "dashboard", "inventario"]'
WHERE slug = 'profissional';

-- Enterprise -> Valor intermediário com alta capacidade
UPDATE public.planos 
SET 
    nome = 'Enterprise',
    preco_mensal = 499.00,
    limite_usuarios = 20,
    descricao = 'Solução completa para imobiliárias em crescimento. 20 usuários e todos os módulos.',
    modulos = '["crm", "dashboard", "inventario", "operacao", "locacao", "sistema"]'
WHERE slug = 'enterprise';

-- 2. Limpar o slug 'trial' para evitar confusão (opcional, ou podemos manter como alias)
-- Por enquanto, vamos apenas garantir que o Trial aponte para o novo Essencial ou removê-lo
-- Se preferir manter o Trial como um passo de entrada, podemos deixá-lo com 0, mas o Essencial já cobre isso.
DELETE FROM public.planos WHERE slug = 'trial';
UPDATE public.planos SET slug = 'free' WHERE slug = 'essencial'; -- Opcional, mas vamos manter os nomes
