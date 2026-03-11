-- Enterprise plan contact form submissions from the marketing pricing page.
-- Only the API route (service role) inserts; admins can read for follow-up.

CREATE TABLE IF NOT EXISTS public.enterprise_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enterprise_inquiries_created_at
  ON public.enterprise_inquiries(created_at DESC);

ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (API route uses createServiceClient)
DROP POLICY IF EXISTS "Service role can manage enterprise_inquiries" ON public.enterprise_inquiries;
CREATE POLICY "Service role can manage enterprise_inquiries"
  ON public.enterprise_inquiries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Platform admins can read for follow-up
DROP POLICY IF EXISTS "Platform admins can read enterprise_inquiries" ON public.enterprise_inquiries;
CREATE POLICY "Platform admins can read enterprise_inquiries"
  ON public.enterprise_inquiries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data->>'platform_admin')::boolean = true
    )
  );
