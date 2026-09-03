-- ==============================================================================
-- Migration: 20260523000000_rls_captacoes_and_cma.sql
-- Description: Políticas de RLS Multi-Tenant vinculadas a auth.jwt() -> imobiliaria_id
--              para a tabela `captacoes`, `laudos_avaliacao` (CMA) e entidades correlatas.
-- ==============================================================================

-- 1. SEGURANÇA MULTI-TENANT: CAPTAÇÕES (Funil de Captação e Imóveis em Prospecção)
ALTER TABLE IF EXISTS public.captacoes ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas legadas ou genéricas
DROP POLICY IF EXISTS "captacoes_select_policy" ON public.captacoes;
DROP POLICY IF EXISTS "captacoes_all_policy" ON public.captacoes;
DROP POLICY IF EXISTS "captacoes_isolation" ON public.captacoes;
DROP POLICY IF EXISTS "captacoes_select" ON public.captacoes;
DROP POLICY IF EXISTS "captacoes_insert" ON public.captacoes;
DROP POLICY IF EXISTS "captacoes_update" ON public.captacoes;
DROP POLICY IF EXISTS "captacoes_delete" ON public.captacoes;

-- SELECT: Admins/Masters veem todas as captações da imobiliária. Corretores veem suas captações ou captações livres.
CREATE POLICY "captacoes_select" ON public.captacoes
  FOR SELECT USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      (auth.jwt() ->> 'app_role' IN ('admin', 'master')) OR 
      (corretor_id::text = auth.jwt() ->> 'corretor_id') OR 
      (corretor_id IS NULL)
    )
  );

-- INSERT: Apenas no contexto da imobiliária do usuário autenticado
CREATE POLICY "captacoes_insert" ON public.captacoes
  FOR INSERT WITH CHECK (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );

-- UPDATE: Admins/Masters podem atualizar qualquer captação; corretores atualizam as suas ou livres
CREATE POLICY "captacoes_update" ON public.captacoes
  FOR UPDATE USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      (auth.jwt() ->> 'app_role' IN ('admin', 'master')) OR 
      (corretor_id::text = auth.jwt() ->> 'corretor_id') OR 
      (corretor_id IS NULL)
    )
  ) WITH CHECK (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );

-- DELETE: Restrito a Administradores e Masters da Imobiliária
CREATE POLICY "captacoes_delete" ON public.captacoes
  FOR DELETE USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      auth.jwt() ->> 'app_role' IN ('admin', 'master')
    )
  );


-- 2. TABELA E POLÍTICAS RLS: LAUDOS DE AVALIAÇÃO / CMA (Comparative Market Analysis)
CREATE TABLE IF NOT EXISTS public.laudos_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imobiliaria_id UUID NOT NULL REFERENCES public.imobiliarias(id) ON DELETE CASCADE,
  imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES public.corretores(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo_imovel TEXT,
  valor_sugerido NUMERIC,
  preco_m2_medio NUMERIC,
  amostragem_total INTEGER DEFAULT 0,
  dados_cma JSONB DEFAULT '{}',
  parecer_ia TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance multi-tenant para CMA
CREATE INDEX IF NOT EXISTS idx_laudos_avaliacao_imob ON public.laudos_avaliacao(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_laudos_avaliacao_imovel ON public.laudos_avaliacao(imovel_id);
CREATE INDEX IF NOT EXISTS idx_laudos_avaliacao_corretor ON public.laudos_avaliacao(corretor_id);

ALTER TABLE public.laudos_avaliacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "laudos_avaliacao_isolation" ON public.laudos_avaliacao;
CREATE POLICY "laudos_avaliacao_isolation" ON public.laudos_avaliacao
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  ) WITH CHECK (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );


-- 3. REFORÇO DE SEGURANÇA EM PARCEIROS E OPORTUNIDADES
ALTER TABLE IF EXISTS public.parceiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parceiros_select_policy" ON public.parceiros;
DROP POLICY IF EXISTS "parceiros_all_policy" ON public.parceiros;
DROP POLICY IF EXISTS "parceiros_isolation" ON public.parceiros;

CREATE POLICY "parceiros_isolation" ON public.parceiros
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  ) WITH CHECK (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );

ALTER TABLE IF EXISTS public.oportunidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oportunidades_select_policy" ON public.oportunidades;
DROP POLICY IF EXISTS "oportunidades_all_policy" ON public.oportunidades;
DROP POLICY IF EXISTS "oportunidades_isolation" ON public.oportunidades;

CREATE POLICY "oportunidades_isolation" ON public.oportunidades
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      (auth.jwt() ->> 'app_role' IN ('admin', 'master')) OR
      (corretor_id::text = auth.jwt() ->> 'corretor_id') OR
      (corretor_id IS NULL)
    )
  ) WITH CHECK (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );
