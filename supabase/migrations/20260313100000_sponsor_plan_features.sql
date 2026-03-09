-- Migration: Sponsor plan features junction table + sponsor feature flags
-- Mirrors the speaker plan_features architecture for sponsors.
-- Enables per-tool MCP feature gating for sponsor tiers.

-- ============================================================================
-- 1. SPONSOR PLAN FEATURES (junction table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_plan_features (
  plan_id UUID NOT NULL REFERENCES public.sponsor_plans(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, feature_flag_id)
);

ALTER TABLE public.sponsor_plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read sponsor plan features" ON public.sponsor_plan_features;
CREATE POLICY "Anyone can read sponsor plan features"
  ON public.sponsor_plan_features FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages sponsor plan features" ON public.sponsor_plan_features;
CREATE POLICY "Service role manages sponsor plan features"
  ON public.sponsor_plan_features FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. SEED SPONSOR FEATURE FLAGS
-- ============================================================================

INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES
  ('sponsor_resource_placements', 'Sponsor Resource Placements', false),
  ('sponsor_lead_analytics', 'Sponsor Lead Analytics', false),
  ('sponsor_resource_analytics', 'Sponsor Resource Analytics', false),
  ('sponsor_bulk_operations', 'Sponsor Bulk Operations', false),
  ('sponsor_engagement_reports', 'Sponsor Engagement Reports', false),
  ('sponsor_cross_speaker_analytics', 'Sponsor Cross-Speaker Analytics', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 3. ASSIGN FEATURES TO SPONSOR PLANS
-- ============================================================================

-- Sponsor Pro: analytics and placements
INSERT INTO public.sponsor_plan_features (plan_id, feature_flag_id)
SELECT sp.id, ff.id
FROM public.sponsor_plans sp, public.feature_flags ff
WHERE sp.name = 'sponsor_pro'
  AND ff.key IN (
    'sponsor_resource_placements',
    'sponsor_lead_analytics',
    'sponsor_resource_analytics'
  )
ON CONFLICT DO NOTHING;

-- Sponsor Enterprise: all sponsor features
INSERT INTO public.sponsor_plan_features (plan_id, feature_flag_id)
SELECT sp.id, ff.id
FROM public.sponsor_plans sp, public.feature_flags ff
WHERE sp.name = 'sponsor_enterprise'
  AND ff.key IN (
    'sponsor_resource_placements',
    'sponsor_lead_analytics',
    'sponsor_resource_analytics',
    'sponsor_bulk_operations',
    'sponsor_engagement_reports',
    'sponsor_cross_speaker_analytics'
  )
ON CONFLICT DO NOTHING;
