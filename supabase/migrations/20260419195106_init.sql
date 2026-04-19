-- =============================================
-- SQL SCHEMA FOR IMOBIA
-- =============================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE tipo_imovel AS ENUM ('apartamento', 'casa', 'terreno', 'loja', 'escritorio', 'garagem', 'armazem', 'quintal');
CREATE TYPE status_imovel AS ENUM ('disponivel', 'reservado', 'vendido', 'arrendado', 'retirado');
CREATE TYPE negocio_imovel AS ENUM ('residencial', 'comercial', 'investimento');
CREATE TYPE moeda AS ENUM ('EUR', 'BRL');
CREATE TYPE finalidade_lead AS ENUM ('comprar', 'alugar', 'investir');
CREATE TYPE status_lead AS ENUM ('novo', 'em_atendimento', 'visita_agendada', 'negociacao', 'contrato', 'fechado', 'sem_interesse');
CREATE TYPE origem_lead AS ENUM ('formulario', 'email_ego', 'webhook_grupozap', 'whatsapp', 'manual');
CREATE TYPE tipo_evento AS ENUM ('visita', 'assinatura', 'cartorio', 'reuniao', 'vistoria', 'outro');
CREATE TYPE status_evento AS ENUM ('agendado', 'realizado', 'cancelado');
CREATE TYPE user_role AS ENUM ('admin', 'corretor');

-- 3. TABLES

-- IMOBILIARIAS
CREATE TABLE imobiliarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_fantasia TEXT NOT NULL,
    identificador_fiscal TEXT NOT NULL,
    numero_registro TEXT NOT NULL,
    plano TEXT CHECK (plano IN ('free', 'pro', 'premium')) DEFAULT 'free',
    config_pais TEXT CHECK (config_pais IN ('PT', 'BR')) NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- CORRETORES
CREATE TABLE corretores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- USUARIOS
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    hash_senha TEXT NOT NULL,
    role user_role DEFAULT 'corretor',
    corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- IMOVEIS
CREATE TABLE imoveis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    referencia TEXT UNIQUE,
    titulo TEXT NOT NULL,
    pais TEXT CHECK (pais IN ('PT', 'BR')) NOT NULL,
    distrito TEXT NOT NULL,
    concelho TEXT NOT NULL,
    freguesia TEXT NOT NULL,
    rua TEXT,
    numero TEXT,
    codigo_postal TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    tipo tipo_imovel NOT NULL,
    finalidade TEXT CHECK (finalidade IN ('venda', 'arrendamento', 'ambos')) NOT NULL,
    negocio negocio_imovel NOT NULL,
    corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
    data_captacao DATE DEFAULT CURRENT_DATE,
    origem_captacao TEXT,
    area_bruta NUMERIC,
    area_util NUMERIC,
    area_terreno NUMERIC,
    quartos INTEGER,
    suites INTEGER,
    casas_banho INTEGER,
    vagas_garagem INTEGER DEFAULT 0,
    andar INTEGER,
    ano_construcao INTEGER,
    estado_conservacao TEXT,
    certificado_energetico TEXT,
    orientacao_solar TEXT[],
    comodidades TEXT[],
    valor NUMERIC NOT NULL,
    moeda moeda NOT NULL,
    valor_avaliacao NUMERIC,
    imi_iptu_anual NUMERIC,
    condominio_mensal NUMERIC,
    aceita_permuta BOOLEAN DEFAULT false,
    aceita_financiamento BOOLEAN DEFAULT true,
    descricao TEXT,
    pontos_venda TEXT[],
    observacoes_internas TEXT,
    status status_imovel DEFAULT 'disponivel',
    fotos JSONB DEFAULT '[]',
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    origem origem_lead NOT NULL,
    portal_origem TEXT,
    moeda moeda NOT NULL,
    finalidade finalidade_lead,
    prazo TEXT,
    pagamento TEXT,
    descricao_interesse TEXT,
    tipo_interesse TEXT,
    orcamento NUMERIC,
    area_interesse NUMERIC,
    quartos_interesse INTEGER,
    vagas_interesse INTEGER,
    bairros_interesse TEXT[],
    corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
    status status_lead DEFAULT 'novo',
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ESCALA
CREATE TABLE escala (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    corretor_id UUID REFERENCES corretores(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    UNIQUE(imobiliaria_id, corretor_id, data)
);

-- EVENTOS (AGENDA)
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
    tipo tipo_evento NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_hora TIMESTAMPTZ NOT NULL,
    local TEXT,
    status status_evento DEFAULT 'agendado',
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
