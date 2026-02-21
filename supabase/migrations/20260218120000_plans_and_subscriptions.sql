-- Subscription plans, feature flags, and speaker subscription tracking.
-- Aligned with pricing page: Free, Early Access (Pro-level, hidden), Pro, Enterprise.
-- New speakers are assigned the Early Access plan via trigger.
-- Idempotent: safe to run multiple times.

-- =============================================================================
-- 1. FEATURE FLAGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(key);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage feature flags" ON public.feature_flags;
CREATE POLICY "Service role can manage feature flags"
  ON public.feature_flags FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated can read feature flags"
  ON public.feature_flags FOR SELECT
  TO authenticated USING (true);

-- =============================================================================
-- 2. PLANS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  price_monthly_cents INTEGER,
  limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_name ON public.plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_sort ON public.plans(sort_order);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage plans" ON public.plans;
CREATE POLICY "Service role can manage plans"
  ON public.plans FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read plans" ON public.plans;
CREATE POLICY "Authenticated can read plans"
  ON public.plans FOR SELECT
  TO authenticated USING (true);

-- =============================================================================
-- 3. PLAN FEATURES (junction: which flags each plan has)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, feature_flag_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON public.plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_flag ON public.plan_features(feature_flag_id);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage plan_features" ON public.plan_features;
CREATE POLICY "Service role can manage plan_features"
  ON public.plan_features FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can read plan_features" ON public.plan_features;
CREATE POLICY "Authenticated can read plan_features"
  ON public.plan_features FOR SELECT
  TO authenticated USING (true);

-- =============================================================================
-- 4. SPEAKER SUBSCRIPTIONS (one active plan per speaker)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.speaker_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (speaker_id)
);

CREATE INDEX IF NOT EXISTS idx_speaker_subscriptions_speaker ON public.speaker_subscriptions(speaker_id);
CREATE INDEX IF NOT EXISTS idx_speaker_subscriptions_plan ON public.speaker_subscriptions(plan_id);

ALTER TABLE public.speaker_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage speaker_subscriptions" ON public.speaker_subscriptions;
CREATE POLICY "Service role can manage speaker_subscriptions"
  ON public.speaker_subscriptions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Speakers can read own subscription" ON public.speaker_subscriptions;
CREATE POLICY "Speakers can read own subscription"
  ON public.speaker_subscriptions FOR SELECT
  TO authenticated
  USING (
    speaker_id IN (SELECT id FROM public.speakers WHERE auth_user_id = auth.uid())
  );

-- =============================================================================
-- 5. SPEAKER FEATURE OVERRIDES (admin grant/revoke per speaker)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.speaker_feature_overrides (
  speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (speaker_id, feature_flag_id)
);

CREATE INDEX IF NOT EXISTS idx_speaker_feature_overrides_speaker ON public.speaker_feature_overrides(speaker_id);

ALTER TABLE public.speaker_feature_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage speaker_feature_overrides" ON public.speaker_feature_overrides;
CREATE POLICY "Service role can manage speaker_feature_overrides"
  ON public.speaker_feature_overrides FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 6. SEED FEATURE FLAGS (aligned with pricing comparison table)
-- =============================================================================
INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES
  ('personalized_branded_urls', 'Personalized branded URLs', false),
  ('profile_bio_photo', 'Profile and bio with photo', false),
  ('custom_resources_links', 'Custom resources and links', false),
  ('multiple_theme_colors', 'Multiple theme colors', false),
  ('surveys_session_feedback', 'Surveys and session feedback', false),
  ('email_list_building', 'Opt-in email list building', false),
  ('custom_expiration', 'Custom expiration dates (30, 60, 90 days)', false),
  ('basic_engagement_stats', 'Basic engagement stats', false),
  ('click_through_analytics', 'Click-through analytics', false),
  ('advanced_reporting', 'Advanced reporting', false),
  ('email_support', 'Email support', false),
  ('priority_support', 'Priority support', false),
  ('dedicated_account_manager', 'Dedicated account manager', false),
  ('sso_team_management', 'SSO and team management', false),
  ('api_access', 'API access', false),
  ('sponsor_visibility', 'Sponsor visibility and links', false)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 7. SEED PLANS (Free, Early Access, Pro, Enterprise)
-- =============================================================================
INSERT INTO public.plans (name, display_name, description, sort_order, is_active, price_monthly_cents, limits)
VALUES
  (
    'free',
    'Free',
    'Everything you need to get started. Our always-free tier when we launch paid plans.',
    10,
    true,
    NULL,
    '{"max_fanflets": 5, "max_resources_per_fanflet": 20}'::jsonb
  ),
  (
    'early_access',
    'Early Access',
    'Pro-level access during early access period. Same features as Pro; used to differentiate early signups from future paid Pro.',
    20,
    true,
    NULL,
    '{"max_fanflets": -1, "max_resources_per_fanflet": -1}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'For speakers who want deeper engagement.',
    30,
    true,
    1200,
    '{"max_fanflets": -1, "max_resources_per_fanflet": -1}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'For organizations and event teams.',
    40,
    true,
    NULL,
    '{"max_fanflets": -1, "max_resources_per_fanflet": -1}'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  limits = EXCLUDED.limits,
  updated_at = now();

-- =============================================================================
-- 8. SEED PLAN FEATURES (map plans to flags per pricing page)
-- =============================================================================
INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, f.id FROM public.plans p, public.feature_flags f
WHERE p.name = 'free'
  AND f.key IN (
    'personalized_branded_urls', 'profile_bio_photo', 'custom_resources_links',
    'basic_engagement_stats', 'email_support'
  )
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, f.id FROM public.plans p, public.feature_flags f
WHERE p.name = 'early_access'
  AND f.key IN (
    'personalized_branded_urls', 'profile_bio_photo', 'custom_resources_links',
    'multiple_theme_colors', 'surveys_session_feedback', 'email_list_building',
    'custom_expiration', 'basic_engagement_stats', 'click_through_analytics',
    'email_support', 'priority_support', 'sponsor_visibility'
  )
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, f.id FROM public.plans p, public.feature_flags f
WHERE p.name = 'pro'
  AND f.key IN (
    'personalized_branded_urls', 'profile_bio_photo', 'custom_resources_links',
    'multiple_theme_colors', 'surveys_session_feedback', 'email_list_building',
    'custom_expiration', 'basic_engagement_stats', 'click_through_analytics',
    'email_support', 'priority_support', 'sponsor_visibility'
  )
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, f.id FROM public.plans p, public.feature_flags f
WHERE p.name = 'enterprise'
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;

-- =============================================================================
-- 9. TRIGGER: Assign Early Access plan when a new speaker is created
-- =============================================================================
CREATE OR REPLACE FUNCTION public.assign_early_access_subscription()
RETURNS TRIGGER
SET search_path = ''
AS $$
DECLARE
  early_plan_id UUID;
BEGIN
  SELECT id INTO early_plan_id
  FROM public.plans
  WHERE name = 'early_access' AND is_active = true
  LIMIT 1;
  IF early_plan_id IS NOT NULL THEN
    INSERT INTO public.speaker_subscriptions (speaker_id, plan_id, status)
    VALUES (NEW.id, early_plan_id, 'active')
    ON CONFLICT (speaker_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_speaker_created_assign_early_access ON public.speakers;
CREATE TRIGGER on_speaker_created_assign_early_access
  AFTER INSERT ON public.speakers
  FOR EACH ROW EXECUTE FUNCTION public.assign_early_access_subscription();
