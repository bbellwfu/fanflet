-- Rename enterprise_inquiries to sponsor_inquiries and add triage columns.
-- RLS policies stay attached to the table after rename.

ALTER TABLE public.enterprise_inquiries RENAME TO sponsor_inquiries;

ALTER INDEX IF EXISTS idx_enterprise_inquiries_created_at RENAME TO idx_sponsor_inquiries_created_at;

ALTER TABLE public.sponsor_inquiries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';

ALTER TABLE public.sponsor_inquiries
  DROP CONSTRAINT IF EXISTS sponsor_inquiries_status_check;

ALTER TABLE public.sponsor_inquiries
  ADD CONSTRAINT sponsor_inquiries_status_check CHECK (status IN ('new', 'contacted', 'closed'));

ALTER TABLE public.sponsor_inquiries
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Platform admins can update status and notes for triage
DROP POLICY IF EXISTS "Platform admins can read enterprise_inquiries" ON public.sponsor_inquiries;
CREATE POLICY "Platform admins can read sponsor_inquiries"
  ON public.sponsor_inquiries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data->>'platform_admin')::boolean = true
    )
  );
CREATE POLICY "Platform admins can update sponsor_inquiries"
  ON public.sponsor_inquiries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data->>'platform_admin')::boolean = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data->>'platform_admin')::boolean = true
    )
  );
