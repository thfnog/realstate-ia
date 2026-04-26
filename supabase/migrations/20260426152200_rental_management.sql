-- ADD RENTAL MANAGEMENT FIELDS
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS taxa_administracao_porcentagem NUMERIC DEFAULT 10.0;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS proprietario_nome TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS proprietario_contato TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS garantia_tipo TEXT CHECK (garantia_tipo IN ('seguro_fianca', 'titulo_capitalizacao', 'fiador', 'caucao', 'sem_garantia'));

-- ENHANCE PAGAMENTOS FOR REPASSES
ALTER TABLE contratos_pagamentos ADD COLUMN IF NOT EXISTS valor_taxa_adm NUMERIC DEFAULT 0;
ALTER TABLE contratos_pagamentos ADD COLUMN IF NOT EXISTS valor_repasse_proprietario NUMERIC DEFAULT 0;
ALTER TABLE contratos_pagamentos ADD COLUMN IF NOT EXISTS status_repasse TEXT DEFAULT 'nao_aplicavel' CHECK (status_repasse IN ('nao_aplicavel', 'pendente', 'processado', 'erro'));

-- TYPES UPDATE (Comment for model to update database.types.ts)
-- Contrato: taxa_administracao_porcentagem, proprietario_nome, proprietario_contato, garantia_tipo
-- PagamentoContrato: valor_taxa_adm, valor_repasse_proprietario, status_repasse
