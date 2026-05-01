-- =============================================
-- DAILY BRIEFING CONFIGURATION
-- =============================================

ALTER TABLE public.imobiliarias
ADD COLUMN IF NOT EXISTS briefing_diario_ativo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS briefing_diario_hora TIME DEFAULT '08:00';

COMMENT ON COLUMN public.imobiliarias.briefing_diario_ativo IS 'Define se o resumo diário automático para corretores está ativo.';
COMMENT ON COLUMN public.imobiliarias.briefing_diario_hora IS 'Hora em que o resumo diário será enviado aos corretores.';
