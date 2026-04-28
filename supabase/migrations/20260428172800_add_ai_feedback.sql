-- =============================================
-- AI FEEDBACK TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_lead_actual BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster retrieval in prompt injection
CREATE INDEX idx_ai_feedback_imob ON ai_feedback(imobiliaria_id);
CREATE INDEX idx_ai_feedback_created ON ai_feedback(created_at DESC);

COMMENT ON TABLE ai_feedback IS 'Armazena exemplos de mensagens que foram classificadas incorretamente para treinar a IA via few-shot.';
