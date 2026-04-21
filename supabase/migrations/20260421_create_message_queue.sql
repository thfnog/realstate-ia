-- Create table for WhatsApp message queue (contingency when instances are offline)
CREATE TABLE IF NOT EXISTS public.mensagens_pendentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID NOT NULL REFERENCES public.imobiliarias(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    corretor_id UUID REFERENCES public.corretores(id) ON DELETE SET NULL,
    telefone_destino TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    tentativas INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'enviado', 'falhou'
    erro_log TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster retrieval of pending messages
CREATE INDEX IF NOT EXISTS idx_mensagens_pendentes_status ON public.mensagens_pendentes(status, instance_name);
