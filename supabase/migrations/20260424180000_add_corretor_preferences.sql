-- Add notification preference columns to corretores table
ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS pref_notif_whatsapp BOOLEAN DEFAULT true;
ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS pref_notif_email BOOLEAN DEFAULT true;
ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS pref_notif_push BOOLEAN DEFAULT true;
ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'disconnected';
ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS whatsapp_instance TEXT;
ALTER TABLE public.corretores ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
