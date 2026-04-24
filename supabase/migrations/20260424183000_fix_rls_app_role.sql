-- Update RLS policies to use app_role claim instead of role claim
-- This is necessary because the standard 'role' claim is now reserved for Supabase's 'authenticated' role.

-- 1. Update Leads Policy
DROP POLICY IF EXISTS "lead_isolation" ON public.leads;
CREATE POLICY "lead_isolation" ON public.leads
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid) AND (
      (auth.jwt() ->> 'app_role' = 'admin') OR 
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
      (corretor_id::text = auth.jwt() ->> 'corretor_id')
    )
  );

-- 3. Update Imoveis Policy (Simplified check to ensure imob_id is read from auth.jwt() correctly)
DROP POLICY IF EXISTS "imovel_isolation" ON public.imoveis;
CREATE POLICY "imovel_isolation" ON public.imoveis
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );

-- 4. Update Corretores Policy
DROP POLICY IF EXISTS "corretor_isolation" ON public.corretores;
CREATE POLICY "corretor_isolation" ON public.corretores
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );

-- 5. Update Usuarios Policy
DROP POLICY IF EXISTS "usuario_isolation" ON public.usuarios;
CREATE POLICY "usuario_isolation" ON public.usuarios
  FOR ALL USING (
    imobiliaria_id = ((auth.jwt() ->> 'imobiliaria_id')::uuid)
  );
