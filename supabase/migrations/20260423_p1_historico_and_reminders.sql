-- 20260423_p1_historico_and_reminders.sql

-- 1. Create message history table
CREATE TABLE IF NOT EXISTS public.mensagens_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID NOT NULL REFERENCES public.imobiliarias(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    corretor_id UUID REFERENCES public.corretores(id) ON DELETE SET NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_text TEXT NOT NULL,
    status TEXT DEFAULT 'sent', -- sent, delivered, read, error (for outbound)
    provider_id TEXT, -- evolution api message id
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_hist_lead ON public.mensagens_historico(lead_id);
CREATE INDEX IF NOT EXISTS idx_msg_hist_data ON public.mensagens_historico(criado_em DESC);

-- 2. Add reminder config columns to imobiliarias
ALTER TABLE public.imobiliarias
ADD COLUMN IF NOT EXISTS config_lembrete_1_horas INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS config_lembrete_2_horas INTEGER DEFAULT 2;
  
-- 3. Add reminder tracking to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS lembrete_1_enviado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lembrete_2_enviado_em TIMESTAMPTZ;

