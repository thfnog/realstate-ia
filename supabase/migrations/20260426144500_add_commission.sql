-- ADD COMMISSION COLUMNS
ALTER TABLE corretores ADD COLUMN IF NOT EXISTS comissao_padrao NUMERIC DEFAULT 5.0;
ALTER TABLE imoveis ADD COLUMN IF NOT EXISTS comissao_venda NUMERIC DEFAULT 5.0;

-- CREATE VENDAS TABLE
CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    imovel_id UUID REFERENCES imoveis(id) ON DELETE SET NULL,
    corretor_id UUID REFERENCES corretores(id) ON DELETE SET NULL,
    valor_venda NUMERIC NOT NULL,
    porcentagem_comissao NUMERIC NOT NULL,
    valor_comissao NUMERIC GENERATED ALWAYS AS (valor_venda * porcentagem_comissao / 100) STORED,
    data_venda TIMESTAMPTZ DEFAULT NOW(),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendas access" ON vendas
    USING (imobiliaria_id IN (
        SELECT imobiliaria_id FROM usuarios WHERE id = auth.uid()
    ));
