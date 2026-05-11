-- Conversation State Machine — Anti-loop & Context Tracking
CREATE TABLE IF NOT EXISTS conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  imobiliaria_id UUID NOT NULL REFERENCES imobiliarias(id),
  state TEXT NOT NULL DEFAULT 'greeting'
    CHECK (state IN ('greeting', 'qualifying', 'recommending', 'feedback', 'scheduling', 'visit_confirmed', 'human_handoff')),
  turn_count INT NOT NULL DEFAULT 0,
  scheduling_attempts INT NOT NULL DEFAULT 0,
  recommendation_cycles INT NOT NULL DEFAULT 0,
  last_recommended_refs TEXT[] DEFAULT '{}',
  last_bot_reply_at TIMESTAMPTZ,
  selected_property_ref TEXT,
  selected_property_id UUID,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversation_state_lead ON conversation_state(lead_id);

-- RLS
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on conversation_state"
  ON conversation_state FOR ALL
  USING (true)
  WITH CHECK (true);
