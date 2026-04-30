-- =============================================
-- Migration: Add Integrations Config
-- Date: 2026-04-30
-- Description: Creates a table to store integration configurations (agnostic).
-- =============================================

CREATE TABLE IF NOT EXISTS imobiliaria_integracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID NOT NULL REFERENCES imobiliarias(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- e.g., 'widesys', 'ego', 'xml_universal'
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- stores url, username, encrypted_password, etc.
    active BOOLEAN NOT NULL DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(imobiliaria_id, provider)
);

-- RLS
ALTER TABLE imobiliaria_integracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for users of the same imobiliaria" ON imobiliaria_integracoes
    FOR SELECT USING (
        auth.uid() IN (
            SELECT auth_user_id FROM usuarios WHERE imobiliaria_id = imobiliaria_integracoes.imobiliaria_id
        )
    );

CREATE POLICY "Enable all for admin" ON imobiliaria_integracoes
    FOR ALL USING (
        auth.uid() IN (
            SELECT auth_user_id FROM usuarios WHERE role = 'admin'
        )
    );

-- Add a column to imoveis to track external origin ID, to ensure we don't mix up references if they change.
-- For now, we use 'referencia' as the external ID, but it's good to have an explicit 'external_id' and 'provider'
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS origin_provider VARCHAR(50);
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS origin_id VARCHAR(255);
