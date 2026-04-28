-- 20260428115500_simplify_slack_config.sql

-- 1. Rename and remove extra channel fields
ALTER TABLE public.configuracoes_sistema RENAME COLUMN slack_channel_system TO slack_channel;
ALTER TABLE public.configuracoes_sistema DROP COLUMN IF EXISTS slack_channel_leads;

-- 2. Update default
ALTER TABLE public.configuracoes_sistema ALTER COLUMN slack_channel SET DEFAULT '#alerts';
