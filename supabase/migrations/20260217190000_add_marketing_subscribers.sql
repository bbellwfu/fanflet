-- Marketing mailing list: platform-level email capture (e.g. pricing page "Subscribe for Updates")
-- Idempotent: safe to run if table/policies already exist (e.g. applied via MCP or previous run)
CREATE TABLE IF NOT EXISTS public.marketing_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'pricing_page',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (email)
);

ALTER TABLE public.marketing_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (no auth needed for marketing subscribe)
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.marketing_subscribers;
CREATE POLICY "Allow anonymous insert"
  ON public.marketing_subscribers FOR INSERT
  TO anon WITH CHECK (true);

-- Only service role can read (admin use)
DROP POLICY IF EXISTS "Service role can read" ON public.marketing_subscribers;
CREATE POLICY "Service role can read"
  ON public.marketing_subscribers FOR SELECT
  TO service_role USING (true);
