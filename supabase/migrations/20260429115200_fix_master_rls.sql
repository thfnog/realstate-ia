-- Update RLS policies to include 'master' role
-- This allows master users to see all leads and events in their agency

-- 1. Update Leads Policy
DROP POLICY IF EXISTS "lead_isolation" ON public.leads;
CREATE POLICY "lead_isolation" ON public.leads
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      (auth.jwt() ->> 'app_role' = 'admin') OR 
      (auth.jwt() ->> 'app_role' = 'master') OR 
      (corretor_id::text = auth.jwt() ->> 'corretor_id') OR
      (corretor_id IS NULL)
    )
  );

-- 2. Update Eventos Policy
DROP POLICY IF EXISTS "evento_isolation" ON public.eventos;
CREATE POLICY "evento_isolation" ON public.eventos
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      (auth.jwt() ->> 'app_role' = 'admin') OR 
      (auth.jwt() ->> 'app_role' = 'master') OR 
      (corretor_id::text = auth.jwt() ->> 'corretor_id')
    )
  );

-- 3. Update Mensagens Historico Policy (if it exists with similar logic)
DROP POLICY IF EXISTS "mensagem_isolation" ON public.mensagens_historico;
CREATE POLICY "mensagem_isolation" ON public.mensagens_historico
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      (auth.jwt() ->> 'app_role' = 'admin') OR 
      (auth.jwt() ->> 'app_role' = 'master') OR 
      (corretor_id::text = auth.jwt() ->> 'corretor_id')
    )
  );
