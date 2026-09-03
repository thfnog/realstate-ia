-- Migration: 20260522000000_add_captacoes.sql
-- Adiciona a tabela de captações para o funil de captação de imóveis via WhatsApp e Manual

CREATE TABLE IF NOT EXISTS captacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imobiliaria_id UUID NOT NULL REFERENCES imobiliarias(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
  imovel_id UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'apartamento',
  finalidade TEXT NOT NULL DEFAULT 'venda', -- 'venda', 'aluguel', 'ambos'
  status TEXT NOT NULL DEFAULT 'prospeccao', -- 'prospeccao', 'avaliacao_realizada', 'autorizacao_assinada', 'fotos_agendadas', 'publicado', 'descartado'
  origem TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'manual', 'site', 'indicacao'
  
  -- Proprietário
  proprietario_nome TEXT,
  proprietario_telefone TEXT,
  proprietario_email TEXT,

  -- Localização
  distrito TEXT, -- Estado
  concelho TEXT, -- Cidade
  freguesia TEXT, -- Bairro
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  codigo_postal TEXT,

  -- Características
  area_util NUMERIC,
  area_total NUMERIC,
  quartos INTEGER,
  suites INTEGER,
  banheiros INTEGER,
  vagas INTEGER,

  -- Financeiro
  valor_estimado NUMERIC,
  valor_locacao_estimado NUMERIC,
  condominio_estimado NUMERIC,
  iptu_estimado NUMERIC,

  -- Detalhes / IA
  descricao TEXT,
  observacoes TEXT,
  fotos TEXT[] DEFAULT '{}',
  dados_ia JSONB DEFAULT '{}',
  
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de busca e filtros
CREATE INDEX IF NOT EXISTS idx_captacoes_imobiliaria ON captacoes(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_captacoes_status ON captacoes(status);
CREATE INDEX IF NOT EXISTS idx_captacoes_corretor ON captacoes(corretor_id);
CREATE INDEX IF NOT EXISTS idx_captacoes_proprietario_telefone ON captacoes(proprietario_telefone);
CREATE INDEX IF NOT EXISTS idx_captacoes_criado_em ON captacoes(criado_em DESC);

-- Habilitar RLS
ALTER TABLE captacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'captacoes' AND policyname = 'captacoes_select_policy'
  ) THEN
    CREATE POLICY captacoes_select_policy ON captacoes FOR SELECT 
      USING (imobiliaria_id = (current_setting('request.jwt.claims', true)::json->>'imobiliaria_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'captacoes' AND policyname = 'captacoes_all_policy'
  ) THEN
    CREATE POLICY captacoes_all_policy ON captacoes FOR ALL 
      USING (imobiliaria_id = (current_setting('request.jwt.claims', true)::json->>'imobiliaria_id')::uuid);
  END IF;
END
$$;
