-- Refine RLS for webhook_ingestion_queue to ensure tenant isolation
DROP POLICY IF EXISTS "service_role_all" ON public.webhook_ingestion_queue;

CREATE POLICY "Users can view logs of their own imobiliaria"
    ON public.webhook_ingestion_queue
    FOR SELECT
    USING (
        imobiliaria_id = (auth.jwt() ->> 'imobiliaria_id')::uuid
    );

-- Prevent unauthorized creation/deletion from the frontend (should be done via API/Admin only)
-- But we already have the API handling this.
