-- ADD CREDIT ANALYSIS FIELDS TO PROPOSALS
ALTER TABLE propostas_aluguel 
ADD COLUMN IF NOT EXISTS analise_credito_check_serasa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS analise_credito_check_renda BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS analise_credito_check_antecedentes BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS analise_credito_parecer TEXT;

-- Index for status to speed up dashboard
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas_aluguel(status);
