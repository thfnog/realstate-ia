-- Subscriptions and Plans Management

-- 1. Create Plans table
CREATE TABLE IF NOT EXISTS public.planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    descricao TEXT,
    preco_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
    modulos JSONB NOT NULL DEFAULT '[]', -- ['crm', 'inventario', 'locacao']
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Subscriptions table
CREATE TABLE IF NOT EXISTS public.assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.imobiliarias(id),
    plano_id UUID NOT NULL REFERENCES public.planos(id),
    status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'atrasado', 'cancelado'
    periodo_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
    periodo_fim TIMESTAMPTZ,
    auto_renovacao BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id) -- One active subscription per tenant for now
);

-- 3. Create Billing (Faturas) table
CREATE TABLE IF NOT EXISTS public.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.imobiliarias(id),
    assinatura_id UUID REFERENCES public.assinaturas(id),
    valor NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'vencido', 'cancelado'
    data_vencimento DATE NOT NULL,
    data_pagamento TIMESTAMPTZ,
    link_pagamento TEXT,
    external_id TEXT, -- ID from payment gateway (Stripe, etc)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Plans: Viewable by all, editable by none (except master via API/DB)
CREATE POLICY "Planos are viewable by everyone" ON public.planos
    FOR SELECT USING (true);

-- Subscriptions: Tenants can see their own
CREATE POLICY "Tenants can view their own subscription" ON public.assinaturas
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.usuarios WHERE imobiliaria_id = tenant_id
    ));

-- Billing: Tenants can see their own
CREATE POLICY "Tenants can view their own invoices" ON public.faturas
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM public.usuarios WHERE imobiliaria_id = tenant_id
    ));

-- 6. Insert Default Plans
INSERT INTO public.planos (nome, slug, descricao, preco_mensal, modulos)
VALUES 
('Essencial', 'essencial', 'Ideal para corretores independentes. Inclui CRM básico e gestão de leads.', 199.00, '["crm", "dashboard"]'),
('Profissional', 'profissional', 'Gestão completa de estoque e CRM avançado.', 499.00, '["crm", "dashboard", "inventario", "operacao"]'),
('Enterprise', 'enterprise', 'Plataforma completa incluindo gestão de locação e financeiro.', 999.00, '["crm", "dashboard", "inventario", "operacao", "locacao", "sistema"]');

-- 7. Add trigger for updated_at
CREATE TRIGGER set_updated_at_planos BEFORE UPDATE ON public.planos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_assinaturas BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
