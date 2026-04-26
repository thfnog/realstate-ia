-- CREATE CONTRATOS TABLE
CREATE TABLE IF NOT EXISTS contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    imovel_id UUID REFERENCES imoveis(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'aluguel')),
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'assinatura_pendente', 'ativo', 'vencido', 'encerrado', 'cancelado')),
    valor_total NUMERIC NOT NULL,
    valor_entrada_caucao NUMERIC DEFAULT 0,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
    clausulas_extras TEXT,
    documento_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE CONTRATOS_PAGAMENTOS TABLE (Financial Control)
CREATE TABLE IF NOT EXISTS contratos_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID REFERENCES contratos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'parcela', 'aluguel_mensal', 'comissao')),
    valor_esperado NUMERIC NOT NULL,
    valor_pago NUMERIC DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- CREATE CONTRATOS_TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS contratos_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    conteudo_base TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contratos access" ON contratos
    USING (imobiliaria_id IN (SELECT imobiliaria_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "Pagamentos access" ON contratos_pagamentos
    USING (contrato_id IN (SELECT id FROM contratos WHERE imobiliaria_id IN (SELECT imobiliaria_id FROM usuarios WHERE id = auth.uid())));

CREATE POLICY "Templates access" ON contratos_templates
    USING (imobiliaria_id IN (SELECT imobiliaria_id FROM usuarios WHERE id = auth.uid()));

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contratos_updated_at
    BEFORE UPDATE ON contratos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
