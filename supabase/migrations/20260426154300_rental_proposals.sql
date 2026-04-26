-- RENTAL PROPOSALS AND DOCUMENTATION
CREATE TABLE IF NOT EXISTS propostas_aluguel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE CASCADE,
    imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
    inquilino_nome TEXT NOT NULL,
    inquilino_email TEXT NOT NULL,
    inquilino_telefone TEXT NOT NULL,
    valor_proposto NUMERIC NOT NULL,
    garantia_pretendida TEXT CHECK (garantia_pretendida IN ('seguro_fianca', 'titulo_capitalizacao', 'fiador', 'caucao')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'aprovada', 'rejeitada', 'cancelada', 'aguardando_documentos')),
    data_pretendida_inicio DATE,
    observacoes TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS propostas_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposta_id UUID REFERENCES propostas_aluguel(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL, -- 'identidade', 'renda', 'residencia', etc
    arquivo_url TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE propostas_aluguel ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see all proposals" ON propostas_aluguel FOR ALL TO authenticated USING (true);
CREATE POLICY "Admins can see all docs" ON propostas_documentos FOR ALL TO authenticated USING (true);
