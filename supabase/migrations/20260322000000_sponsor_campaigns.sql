-- Sponsor Campaigns (Content Hub Phase 3)
-- Tables: sponsor_campaigns, sponsor_campaign_kols.
-- FK from sponsor_resource_library.campaign_id to sponsor_campaigns.
-- Idempotent: safe to run multiple times.

-- =============================================================================
-- 1. SPONSOR_CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  crm_reference JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_sponsor
  ON public.sponsor_campaigns(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_status
  ON public.sponsor_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_dates
  ON public.sponsor_campaigns(start_date, end_date);

ALTER TABLE public.sponsor_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sponsors can manage own campaigns" ON public.sponsor_campaigns;
CREATE POLICY "Sponsors can manage own campaigns"
  ON public.sponsor_campaigns FOR ALL TO authenticated
  USING (
    sponsor_id IN (SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    sponsor_id IN (SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role can manage sponsor_campaigns" ON public.sponsor_campaigns;
CREATE POLICY "Service role can manage sponsor_campaigns"
  ON public.sponsor_campaigns FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 2. SPONSOR_CAMPAIGN_KOLS (junction)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_campaign_kols (
  campaign_id UUID NOT NULL REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (campaign_id, speaker_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_campaign_kols_campaign
  ON public.sponsor_campaign_kols(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_campaign_kols_speaker
  ON public.sponsor_campaign_kols(speaker_id);

ALTER TABLE public.sponsor_campaign_kols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sponsors can manage own campaign KOLs" ON public.sponsor_campaign_kols;
CREATE POLICY "Sponsors can manage own campaign KOLs"
  ON public.sponsor_campaign_kols FOR ALL TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.sponsor_campaigns
      WHERE sponsor_id IN (SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.sponsor_campaigns
      WHERE sponsor_id IN (SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Service role can manage sponsor_campaign_kols" ON public.sponsor_campaign_kols;
CREATE POLICY "Service role can manage sponsor_campaign_kols"
  ON public.sponsor_campaign_kols FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 3. FK from sponsor_resource_library.campaign_id to sponsor_campaigns
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sponsor_resource_library_campaign_id_fkey'
    AND conrelid = 'public.sponsor_resource_library'::regclass
  ) THEN
    ALTER TABLE public.sponsor_resource_library
      ADD CONSTRAINT sponsor_resource_library_campaign_id_fkey
      FOREIGN KEY (campaign_id) REFERENCES public.sponsor_campaigns(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- =============================================================================
-- 4. FEATURE FLAG: sponsor_campaigns (Enterprise)
-- =============================================================================

INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES ('sponsor_campaigns', 'Sponsor campaign management', false)
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  flag_id UUID;
BEGIN
  SELECT id INTO flag_id FROM public.feature_flags WHERE key = 'sponsor_campaigns' LIMIT 1;
  IF flag_id IS NOT NULL THEN
    INSERT INTO public.sponsor_plan_features (plan_id, feature_flag_id)
    SELECT id, flag_id FROM public.sponsor_plans WHERE name = 'sponsor_enterprise'
    ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;
  END IF;
END;
$$;
