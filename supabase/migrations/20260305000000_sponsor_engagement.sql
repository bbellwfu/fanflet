-- Sponsor Engagement: consent, sponsor_leads, report tokens, feature flag.
-- Idempotent: safe to run multiple times.

-- =============================================================================
-- 1. SUBSCRIBERS: sponsor_consent column
-- =============================================================================
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS sponsor_consent BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- 2. RESOURCE_BLOCKS: sponsor_account_id (link block to sponsor for lead attribution)
-- =============================================================================
ALTER TABLE public.resource_blocks
  ADD COLUMN IF NOT EXISTS sponsor_account_id UUID
    REFERENCES public.sponsor_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resource_blocks_sponsor_account
  ON public.resource_blocks(sponsor_account_id)
  WHERE sponsor_account_id IS NOT NULL;

-- =============================================================================
-- 3. SPONSOR_LEADS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sponsor_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  fanflet_id UUID NOT NULL REFERENCES public.fanflets(id) ON DELETE CASCADE,
  resource_block_id UUID REFERENCES public.resource_blocks(id) ON DELETE SET NULL,
  sponsor_resource_id UUID REFERENCES public.sponsor_resources(id) ON DELETE SET NULL,
  engagement_type TEXT NOT NULL,
  resource_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_leads_sponsor_created
  ON public.sponsor_leads(sponsor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_subscriber
  ON public.sponsor_leads(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_fanflet_sponsor
  ON public.sponsor_leads(fanflet_id, sponsor_id);

ALTER TABLE public.sponsor_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage sponsor_leads" ON public.sponsor_leads;
CREATE POLICY "Service role can manage sponsor_leads"
  ON public.sponsor_leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Speakers can read sponsor leads for own fanflets" ON public.sponsor_leads;
CREATE POLICY "Speakers can read sponsor leads for own fanflets"
  ON public.sponsor_leads FOR SELECT TO authenticated
  USING (fanflet_id IN (
    SELECT f.id FROM public.fanflets f
    JOIN public.speakers s ON f.speaker_id = s.id
    WHERE s.auth_user_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "Sponsors can read own leads" ON public.sponsor_leads;
CREATE POLICY "Sponsors can read own leads"
  ON public.sponsor_leads FOR SELECT TO authenticated
  USING (sponsor_id IN (
    SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
  ));

-- =============================================================================
-- 4. SPONSOR_REPORT_TOKENS (magic links)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sponsor_report_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  fanflet_id UUID NOT NULL REFERENCES public.fanflets(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  created_by_speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_report_tokens_token
  ON public.sponsor_report_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sponsor_report_tokens_expires
  ON public.sponsor_report_tokens(expires_at);

ALTER TABLE public.sponsor_report_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage sponsor_report_tokens" ON public.sponsor_report_tokens;
CREATE POLICY "Service role can manage sponsor_report_tokens"
  ON public.sponsor_report_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Speakers can manage report tokens for own fanflets" ON public.sponsor_report_tokens;
CREATE POLICY "Speakers can manage report tokens for own fanflets"
  ON public.sponsor_report_tokens FOR ALL TO authenticated
  USING (created_by_speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (created_by_speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ));

-- Anonymous can read valid tokens (for public report page)
DROP POLICY IF EXISTS "Anonymous can read valid report tokens" ON public.sponsor_report_tokens;
CREATE POLICY "Anonymous can read valid report tokens"
  ON public.sponsor_report_tokens FOR SELECT TO anon
  USING (expires_at > now());

-- =============================================================================
-- 5. ANALYTICS_EVENTS: add sms_bookmark to event_type check
-- =============================================================================
ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'page_view', 'resource_click', 'email_signup',
    'qr_scan', 'referral_click', 'resource_download', 'sms_bookmark'
  ));

-- =============================================================================
-- 6. FEATURE FLAG: sponsor_reports
-- =============================================================================
INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES ('sponsor_reports', 'Sponsor engagement reports', false)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 7. PLAN FEATURES: Pro and Enterprise get sponsor_reports
-- =============================================================================
INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, f.id FROM public.plans p, public.feature_flags f
WHERE p.name IN ('pro', 'enterprise')
  AND f.key = 'sponsor_reports'
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;
