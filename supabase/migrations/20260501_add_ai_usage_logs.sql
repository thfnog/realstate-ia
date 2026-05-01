-- =============================================
-- AI USAGE LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    provider TEXT DEFAULT 'groq',
    model TEXT,
    feature TEXT, -- 'extraction', 'auto-reply', 'recommendation'
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success',
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for stats
CREATE INDEX idx_ai_usage_imob ON ai_usage_logs(imobiliaria_id);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at DESC);

COMMENT ON TABLE ai_usage_logs IS 'Rastreia o uso de APIs de IA (Groq/OpenAI) para métricas e faturamento.';
