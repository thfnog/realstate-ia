-- =========================================================
-- Sprint P4: Multi-Tenant Foundation (RLS Policies)
-- Description: Enable RLS and isolate data by imobiliaria_id
-- =========================================================

-- 1. Enable RLS on all core tables
ALTER TABLE imobiliarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE corretores ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_historico ENABLE ROW LEVEL SECURITY;

-- 2. Create helper functions to extract claims from JWT (in public schema)
CREATE OR REPLACE FUNCTION public.jwt_claims() 
RETURNS jsonb AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.imob_id() 
RETURNS uuid AS $$
  SELECT (public.jwt_claims()->>'imobiliaria_id')::uuid;
$$ LANGUAGE sql STABLE;

-- 3. Create Tenant Isolation Policies

-- Imobiliarias: Admins can only see their own imobiliaria
CREATE POLICY "imobiliaria_isolation" ON imobiliarias
  FOR ALL USING (id = public.imob_id());

-- Usuarios: Isolated by imobiliaria_id
CREATE POLICY "usuario_isolation" ON usuarios
  FOR ALL USING (imobiliaria_id = public.imob_id());

-- Corretores: Isolated by imobiliaria_id
CREATE POLICY "corretor_isolation" ON corretores
  FOR ALL USING (imobiliaria_id = public.imob_id());

-- Imoveis: Isolated by imobiliaria_id
CREATE POLICY "imovel_isolation" ON imoveis
  FOR ALL USING (imobiliaria_id = public.imob_id());

-- Escala: Isolated by imobiliaria_id
CREATE POLICY "escala_isolation" ON escala
  FOR ALL USING (imobiliaria_id = public.imob_id());

-- Leads: Isolated by imobiliaria_id + Role check
CREATE POLICY "lead_isolation" ON leads
  FOR ALL USING (
    imobiliaria_id = public.imob_id() AND (
      (public.jwt_claims()->>'role' = 'admin') OR 
      (corretor_id::text = public.jwt_claims()->>'corretor_id') OR
      (corretor_id IS NULL) -- Allow seeing unassigned leads? Usually yes for visibility
    )
  );

-- Eventos: Isolated by imobiliaria_id + Role check
CREATE POLICY "evento_isolation" ON eventos
  FOR ALL USING (
    imobiliaria_id = public.imob_id() AND (
      (public.jwt_claims()->>'role' = 'admin') OR 
      (corretor_id::text = public.jwt_claims()->>'corretor_id')
    )
  );

-- Mensagens: Isolated by imobiliaria_id
CREATE POLICY "mensagem_isolation" ON mensagens_historico
  FOR ALL USING (imobiliaria_id = public.imob_id());


-- 4. Special Policies for Auth / Public Ingestion
-- Allow anonymous lead creation for public forms
CREATE POLICY "public_lead_insertion" ON leads
  FOR INSERT WITH CHECK (true);


-- Allow admins to see all users in their imobiliaria
-- (Already covered by generic isolations, but can be more specific)
