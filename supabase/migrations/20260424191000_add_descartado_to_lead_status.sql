-- Add 'descartado' to status_lead enum
-- We use DO block to check if it already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'status_lead' AND e.enumlabel = 'descartado') THEN
        ALTER TYPE status_lead ADD VALUE 'descartado';
    END IF;
END
$$;
