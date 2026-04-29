-- =============================================
-- Migration: Expand Imovel Structure
-- Date: 2026-04-29
-- Description: Adds new property types, status values, and fields
--              for proprietário, empreendimento, despesas, áreas, mídia.
-- RETROCOMPATIBLE: All new columns are nullable, no renaming.
-- =============================================

-- 1. New columns on imoveis table
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS empreendimento TEXT;

-- Proprietário
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS proprietario_nome TEXT;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS proprietario_telefone TEXT;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS proprietario_email TEXT;

-- Áreas detalhadas
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS area_construida NUMERIC;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS area_privativa NUMERIC;

-- Cômodos extras
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS salas INTEGER;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS num_andares INTEGER;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS num_torres INTEGER;

-- Comodidades do condomínio (separadas das do imóvel)
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS comodidades_condominio JSONB DEFAULT '[]'::jsonb;

-- Financeiro expandido
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS valor_locacao NUMERIC;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS seguro_incendio_mensal NUMERIC;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS taxa_administracao_pct NUMERIC;

-- Mídia
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS tour_360_url TEXT;

-- 2. Update Enums (Run these individually if the migration fails due to transaction restrictions)
-- NOTE: PostgreSQL ADD VALUE cannot be executed inside a transaction block in some versions.
ALTER TYPE tipo_imovel ADD VALUE 'apartamento_duplex';
ALTER TYPE tipo_imovel ADD VALUE 'cobertura';
ALTER TYPE tipo_imovel ADD VALUE 'kitnet';
ALTER TYPE tipo_imovel ADD VALUE 'flat';
ALTER TYPE tipo_imovel ADD VALUE 'casa_condominio';
ALTER TYPE tipo_imovel ADD VALUE 'sobrado';
ALTER TYPE tipo_imovel ADD VALUE 'chacara';
ALTER TYPE tipo_imovel ADD VALUE 'sitio';
ALTER TYPE tipo_imovel ADD VALUE 'fazenda';
ALTER TYPE tipo_imovel ADD VALUE 'lote';
ALTER TYPE tipo_imovel ADD VALUE 'sala_comercial';
ALTER TYPE tipo_imovel ADD VALUE 'galpao';
ALTER TYPE tipo_imovel ADD VALUE 'barracao';

ALTER TYPE status_imovel ADD VALUE 'alugado';
ALTER TYPE status_imovel ADD VALUE 'indisponivel';
ALTER TYPE status_imovel ADD VALUE 'em_reforma';

ALTER TYPE negocio_imovel ADD VALUE 'misto';
ALTER TYPE negocio_imovel ADD VALUE 'rural';
ALTER TYPE negocio_imovel ADD VALUE 'industrial';

