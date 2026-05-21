-- 1. Adicionar campos de grupo e classificação na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS grupo_nome TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS grupo_jid TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS classificacao TEXT DEFAULT 'indefinido';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS classificacao_confianca NUMERIC(3,2) DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS classificacao_motivo TEXT;

-- Popular retroativamente a partir do portal_origem (se aplicável)
UPDATE leads 
SET grupo_nome = REGEXP_REPLACE(portal_origem, '^WhatsApp Grupo: ', '')
WHERE portal_origem ILIKE 'WhatsApp Grupo:%' AND grupo_nome IS NULL;

-- Criar índices de busca e filtro para leads
CREATE INDEX IF NOT EXISTS idx_leads_grupo_nome ON leads(grupo_nome) WHERE grupo_nome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_classificacao ON leads(classificacao);

-- 2. Criar tabela de parceiros (corretores externos conhecidos)
CREATE TABLE IF NOT EXISTS parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imobiliaria_id UUID NOT NULL REFERENCES imobiliarias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  creci TEXT,
  imobiliaria_nome TEXT,
  notas TEXT,
  ativo BOOLEAN DEFAULT true,
  total_negocios INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_imobiliaria_parceiro_telefone UNIQUE(imobiliaria_id, telefone)
);

-- Criar índices de busca para parceiros
CREATE INDEX IF NOT EXISTS idx_parceiros_telefone ON parceiros(telefone);
CREATE INDEX IF NOT EXISTS idx_parceiros_imobiliaria ON parceiros(imobiliaria_id);

-- 3. Criar tabela de oportunidades de parceria
CREATE TABLE IF NOT EXISTS oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imobiliaria_id UUID NOT NULL REFERENCES imobiliarias(id) ON DELETE CASCADE,
  parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'parceria_venda', -- 'parceria_venda', 'parceria_locacao', 'indicacao', 'permuta', 'captacao'
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'nova', -- 'nova', 'em_negociacao', 'aceita', 'recusada', 'concluida'
  valor_estimado NUMERIC,
  comissao_parceiro NUMERIC,
  imovel_id UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  dados JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices de busca para oportunidades
CREATE INDEX IF NOT EXISTS idx_oportunidades_status ON oportunidades(status);
CREATE INDEX IF NOT EXISTS idx_oportunidades_parceiro ON oportunidades(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_imobiliaria ON oportunidades(imobiliaria_id);

-- Habilitar RLS nas tabelas novas
ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;

-- Criar políticas de RLS baseadas no tenant (imobiliaria_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parceiros' AND policyname = 'parceiros_select_policy'
  ) THEN
    CREATE POLICY parceiros_select_policy ON parceiros FOR SELECT 
      USING (imobiliaria_id = (current_setting('request.jwt.claims', true)::json->>'imobiliaria_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parceiros' AND policyname = 'parceiros_all_policy'
  ) THEN
    CREATE POLICY parceiros_all_policy ON parceiros FOR ALL 
      USING (imobiliaria_id = (current_setting('request.jwt.claims', true)::json->>'imobiliaria_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'oportunidades' AND policyname = 'oportunidades_select_policy'
  ) THEN
    CREATE POLICY oportunidades_select_policy ON oportunidades FOR SELECT 
      USING (imobiliaria_id = (current_setting('request.jwt.claims', true)::json->>'imobiliaria_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'oportunidades' AND policyname = 'oportunidades_all_policy'
  ) THEN
    CREATE POLICY oportunidades_all_policy ON oportunidades FOR ALL 
      USING (imobiliaria_id = (current_setting('request.jwt.claims', true)::json->>'imobiliaria_id')::uuid);
  END IF;
END
$$;

-- 4. Adicionar suporte a áudio na tabela mensagens_historico
ALTER TABLE mensagens_historico ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text';
ALTER TABLE mensagens_historico ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE mensagens_historico ADD COLUMN IF NOT EXISTS transcricao TEXT;
ALTER TABLE mensagens_historico ADD COLUMN IF NOT EXISTS transcricao_confianca NUMERIC(3,2);
ALTER TABLE mensagens_historico ADD COLUMN IF NOT EXISTS duracao_segundos INTEGER;

-- Criar índice para mensagens com mídia (filtrando texto comum)
CREATE INDEX IF NOT EXISTS idx_mensagens_media_type ON mensagens_historico(media_type) 
  WHERE media_type IS NOT NULL AND media_type != 'text';
