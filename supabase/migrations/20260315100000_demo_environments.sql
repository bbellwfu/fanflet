-- Demo environments: personalized, AI-generated demo accounts for prospects.
-- Adds is_demo flags to speakers/sponsor_accounts and a tracking table.

-- 1. speakers: demo flag columns
ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS demo_created_by UUID;
ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;
ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS demo_prospect_email TEXT;
ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS demo_converted_at TIMESTAMPTZ;

-- 2. sponsor_accounts: demo flag columns
ALTER TABLE public.sponsor_accounts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.sponsor_accounts ADD COLUMN IF NOT EXISTS demo_created_by UUID;

-- 3. demo_environments tracking table
CREATE TABLE IF NOT EXISTS public.demo_environments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_name TEXT NOT NULL,
  prospect_email TEXT,
  prospect_specialty TEXT,
  prospect_notes TEXT,
  speaker_id UUID REFERENCES public.speakers(id) ON DELETE SET NULL,
  auth_user_id UUID,
  sponsor_account_ids UUID[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning', 'active', 'failed', 'converted', 'expired', 'deleted')),
  error_message TEXT,
  converted_at TIMESTAMPTZ,
  converted_to_speaker_id UUID REFERENCES public.speakers(id),
  research_input JSONB,
  ai_generated_payload JSONB,
  seed_manifest JSONB,
  notes TEXT
);

ALTER TABLE public.demo_environments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages demo_environments" ON public.demo_environments;
CREATE POLICY "Service role manages demo_environments"
  ON public.demo_environments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read demo_environments" ON public.demo_environments;
CREATE POLICY "Admins can read demo_environments"
  ON public.demo_environments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'platform_admin')
        AND removed_at IS NULL
    )
  );

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_demo_environments_status ON public.demo_environments(status);
CREATE INDEX IF NOT EXISTS idx_demo_environments_expires_at ON public.demo_environments(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_demo_environments_prospect_email ON public.demo_environments(prospect_email) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_speakers_is_demo ON public.speakers(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_is_demo ON public.sponsor_accounts(is_demo) WHERE is_demo = true;
