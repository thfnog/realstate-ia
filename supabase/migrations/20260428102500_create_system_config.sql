-- 20260428102500_create_system_config.sql

-- 1. Create System Config table (Singleton)
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
    id INTEGER PRIMARY KEY DEFAULT 1,
    resend_api_key TEXT,
    resend_from_email TEXT DEFAULT 'ImobIA <convite@imobia.com.br>',
    slack_webhook_url TEXT,
    slack_channel_leads TEXT DEFAULT '#leads',
    slack_channel_system TEXT DEFAULT '#sistema',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT singleton_check CHECK (id = 1)
);

-- 2. Enable RLS
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Only Master can see and edit
CREATE POLICY "Master only access to system config" ON public.configuracoes_sistema
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND role = 'master'
        )
    );

-- 4. Initial record
INSERT INTO public.configuracoes_sistema (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 5. Trigger for updated_at
CREATE TRIGGER set_updated_at_system_config 
BEFORE UPDATE ON public.configuracoes_sistema 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
