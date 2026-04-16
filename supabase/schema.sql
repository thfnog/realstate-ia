-- =============================================
-- Schema: MVP Automação Imobiliária
-- =============================================

-- Corretores (Brokers)
CREATE TABLE corretores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Imóveis (Properties)
CREATE TABLE imoveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('apartamento', 'casa', 'terreno')),
  bairro TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  area_m2 NUMERIC,
  quartos INTEGER,
  vagas INTEGER DEFAULT 0,
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'vendido', 'alugado')),
  link_fotos TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Escala de plantão (Duty Schedule)
CREATE TABLE escala (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID REFERENCES corretores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  UNIQUE(corretor_id, data)
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  finalidade TEXT CHECK (finalidade IN ('comprar', 'alugar', 'investir')),
  prazo TEXT,
  pagamento TEXT,
  descricao_interesse TEXT,
  tipo_interesse TEXT,
  orcamento NUMERIC,
  area_interesse NUMERIC,
  quartos_interesse INTEGER,
  vagas_interesse INTEGER,
  bairros_interesse TEXT[],
  corretor_id UUID REFERENCES corretores(id),
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'fechado')),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_leads_telefone ON leads(telefone);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_criado_em ON leads(criado_em DESC);
CREATE INDEX idx_escala_data ON escala(data);
CREATE INDEX idx_imoveis_status ON imoveis(status);
CREATE INDEX idx_corretores_ativo ON corretores(ativo);

-- Enable Row Level Security (optional for MVP, but good practice)
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policies: allow all access via service key (MVP)
CREATE POLICY "Allow all for service role" ON corretores FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON imoveis FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON escala FOR ALL USING (true);
CREATE POLICY "Allow all for service role" ON leads FOR ALL USING (true);

-- Policy: allow public insert on leads (for the form)
CREATE POLICY "Allow public insert on leads" ON leads FOR INSERT WITH CHECK (true);
