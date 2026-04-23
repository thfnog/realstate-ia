-- 20260423_unique_phone_per_imob.sql
-- Aplica uma restrição para que não existam leads com o mesmo telefone para a mesma imobiliária.
-- NOTA: Isso evita que o webhook ou processamento assíncrono crie múltiplos leads para o mesmo contato de WhatsApp.

ALTER TABLE public.leads
ADD CONSTRAINT unique_imob_telefone UNIQUE (imobiliaria_id, telefone);
