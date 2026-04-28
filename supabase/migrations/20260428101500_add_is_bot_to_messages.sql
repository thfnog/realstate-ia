-- 20260428101500_add_is_bot_to_messages.sql

-- 1. Add is_bot column to mensagens_historico
ALTER TABLE public.mensagens_historico
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- 2. Add index for performance in stats
CREATE INDEX IF NOT EXISTS idx_msg_hist_is_bot ON public.mensagens_historico(is_bot, imobiliaria_id);

-- 3. Update existing records (heuristic: messages without corretor_id and outbound are likely bot)
UPDATE public.mensagens_historico
SET is_bot = true
WHERE direction = 'outbound' AND corretor_id IS NULL AND is_bot = false;
