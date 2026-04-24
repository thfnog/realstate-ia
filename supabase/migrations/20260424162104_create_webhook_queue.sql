-- Create table for incoming webhooks queue (asynchronous processing)
CREATE TABLE IF NOT EXISTS public.webhook_ingestion_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID NOT NULL REFERENCES public.imobiliarias(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- 'whatsapp', 'email', 'grupozap', etc.
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'concluido', 'erro'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for processing optimization
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status_created ON public.webhook_ingestion_queue(status, created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhook_queue_updated_at
    BEFORE UPDATE ON public.webhook_ingestion_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Security First)
ALTER TABLE public.webhook_ingestion_queue ENABLE ROW LEVEL SECURITY;

-- Only service role (admin) can see/manage the queue by default
-- Or we can add specific policies if needed later.
CREATE POLICY "service_role_all" ON public.webhook_ingestion_queue
    FOR ALL USING (true); -- Service role bypasses this anyway, but good to have a policy for clear intent
