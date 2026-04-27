-- 20260427203000_update_plans_and_imob_limits.sql

-- 1. Adicionar limite de usuários aos planos
ALTER TABLE public.planos 
ADD COLUMN IF NOT EXISTS limite_usuarios INTEGER DEFAULT 5;

-- Atualizar planos existentes com limites sugeridos
UPDATE public.planos SET limite_usuarios = 2 WHERE slug = 'essencial';
UPDATE public.planos SET limite_usuarios = 10 WHERE slug = 'profissional';
UPDATE public.planos SET limite_usuarios = 50 WHERE slug = 'enterprise';

-- 2. Adicionar informações de cartão (mock para o piloto) à imobiliária
ALTER TABLE public.imobiliarias
ADD COLUMN IF NOT EXISTS cartao_final TEXT,
ADD COLUMN IF NOT EXISTS cartao_bandeira TEXT,
ADD COLUMN IF NOT EXISTS cartao_token TEXT;

-- 3. Políticas adicionais para permitir que admins vejam faturas e assinaturas de sua imobiliária
-- (Ajustando as políticas existentes que usavam auth.uid() incorretamente para o modelo de usuários da tabela public.usuarios)

DROP POLICY IF EXISTS "Tenants can view their own subscription" ON public.assinaturas;
CREATE POLICY "Tenants can view their own subscription" ON public.assinaturas
    FOR SELECT USING (
        tenant_id IN (
            SELECT imobiliaria_id FROM public.usuarios WHERE auth_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Tenants can view their own invoices" ON public.faturas;
CREATE POLICY "Tenants can view their own invoices" ON public.faturas
    FOR SELECT USING (
        tenant_id IN (
            SELECT imobiliaria_id FROM public.usuarios WHERE auth_id = auth.uid()
        )
    );
