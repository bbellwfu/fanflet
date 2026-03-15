-- =============================================================================
-- Sponsor Tier Realignment: 3 plans → 2 (Connect + Studio)
-- =============================================================================
-- Consolidates sponsor_free → sponsor_connect, sponsor_pro → sponsor_studio,
-- deactivates sponsor_enterprise. Adds Pilot support columns, 6 new Studio
-- feature flags, and updates the auto-assign trigger.
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD 6 NEW STUDIO-ONLY FEATURE FLAGS
-- ---------------------------------------------------------------------------

INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES
  ('sponsor_branded_landing_page', 'Sponsor Branded Landing Page', false),
  ('sponsor_sso', 'Sponsor SSO', false),
  ('sponsor_audit_log', 'Sponsor Audit Log', false),
  ('sponsor_scheduled_reports', 'Sponsor Scheduled Reports', false),
  ('sponsor_kol_seat_licensing', 'Sponsor Speaker Seat Licensing', false),
  ('sponsor_multi_user_access', 'Sponsor Multi-User Access', false)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. RENAME sponsor_free → sponsor_connect
-- ---------------------------------------------------------------------------

UPDATE public.sponsor_plans
SET
  name = 'sponsor_connect',
  display_name = 'Sponsor Connect',
  description = 'Connect with speakers and share resources',
  price_monthly_cents = 14900,
  limits = '{"max_connections": 5, "max_resources": -1, "max_campaigns": 3, "max_users": 1, "storage_mb": 500, "analytics_retention_days": 90}'::jsonb,
  sort_order = 0,
  is_active = true,
  is_public = true,
  updated_at = now()
WHERE name = 'sponsor_free';

-- ---------------------------------------------------------------------------
-- 3. RENAME sponsor_pro → sponsor_studio
-- ---------------------------------------------------------------------------

UPDATE public.sponsor_plans
SET
  name = 'sponsor_studio',
  display_name = 'Sponsor Studio',
  description = 'Full platform access with unlimited connections and advanced analytics',
  price_monthly_cents = 79000,
  limits = '{"max_connections": -1, "max_resources": -1, "max_campaigns": -1, "max_users": -1, "storage_mb": 5000, "analytics_retention_days": -1}'::jsonb,
  sort_order = 1,
  is_active = true,
  is_public = true,
  updated_at = now()
WHERE name = 'sponsor_pro';

-- ---------------------------------------------------------------------------
-- 4. MIGRATE sponsor_enterprise SUBSCRIBERS → sponsor_studio, THEN DEACTIVATE
-- ---------------------------------------------------------------------------

-- Move any active enterprise subscribers to studio
UPDATE public.sponsor_subscriptions
SET
  plan_id = (SELECT id FROM public.sponsor_plans WHERE name = 'sponsor_studio'),
  limits_snapshot = '{"max_connections": -1, "max_resources": -1, "max_campaigns": -1, "max_users": -1, "storage_mb": 5000, "analytics_retention_days": -1}'::jsonb,
  updated_at = now()
WHERE plan_id = (SELECT id FROM public.sponsor_plans WHERE name = 'sponsor_enterprise');

-- Deactivate the enterprise plan (keep row for FK integrity)
UPDATE public.sponsor_plans
SET
  is_active = false,
  is_public = false,
  updated_at = now()
WHERE name = 'sponsor_enterprise';

-- ---------------------------------------------------------------------------
-- 5. ADD PILOT SUPPORT COLUMNS ON sponsor_subscriptions
-- ---------------------------------------------------------------------------

ALTER TABLE public.sponsor_subscriptions
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN DEFAULT false;

-- ---------------------------------------------------------------------------
-- 6. REASSIGN FEATURE FLAGS TO NEW PLANS
-- ---------------------------------------------------------------------------

-- Clear ALL feature flag assignments for the deactivated enterprise plan
DELETE FROM public.sponsor_plan_features
WHERE plan_id = (SELECT id FROM public.sponsor_plans WHERE name = 'sponsor_enterprise');

-- Clear existing Connect (formerly Free) assignments to rebuild cleanly
DELETE FROM public.sponsor_plan_features
WHERE plan_id = (SELECT id FROM public.sponsor_plans WHERE name = 'sponsor_connect');

-- Clear existing Studio (formerly Pro) assignments to rebuild cleanly
DELETE FROM public.sponsor_plan_features
WHERE plan_id = (SELECT id FROM public.sponsor_plans WHERE name = 'sponsor_studio');

-- Connect features: resource placements, lead analytics, resource analytics, library, campaigns
INSERT INTO public.sponsor_plan_features (plan_id, feature_flag_id)
SELECT sp.id, ff.id
FROM public.sponsor_plans sp
CROSS JOIN public.feature_flags ff
WHERE sp.name = 'sponsor_connect'
  AND ff.key IN (
    'sponsor_resource_placements',
    'sponsor_lead_analytics',
    'sponsor_resource_analytics',
    'sponsor_resource_library',
    'sponsor_campaigns'
  )
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;

-- Studio features: all Connect features + bulk ops, engagement reports,
-- cross-speaker analytics, branded landing page, SSO, audit log,
-- scheduled reports, speaker seat licensing, multi-user access
INSERT INTO public.sponsor_plan_features (plan_id, feature_flag_id)
SELECT sp.id, ff.id
FROM public.sponsor_plans sp
CROSS JOIN public.feature_flags ff
WHERE sp.name = 'sponsor_studio'
  AND ff.key IN (
    'sponsor_resource_placements',
    'sponsor_lead_analytics',
    'sponsor_resource_analytics',
    'sponsor_resource_library',
    'sponsor_campaigns',
    'sponsor_bulk_operations',
    'sponsor_engagement_reports',
    'sponsor_cross_speaker_analytics',
    'sponsor_branded_landing_page',
    'sponsor_sso',
    'sponsor_audit_log',
    'sponsor_scheduled_reports',
    'sponsor_kol_seat_licensing',
    'sponsor_multi_user_access'
  )
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. UPDATE limits_snapshot FOR ALL ACTIVE SUBSCRIPTIONS
-- ---------------------------------------------------------------------------

-- Update Connect subscribers' snapshots
UPDATE public.sponsor_subscriptions ss
SET
  limits_snapshot = sp.limits,
  updated_at = now()
FROM public.sponsor_plans sp
WHERE ss.plan_id = sp.id
  AND sp.name = 'sponsor_connect'
  AND ss.status = 'active';

-- Update Studio subscribers' snapshots
UPDATE public.sponsor_subscriptions ss
SET
  limits_snapshot = sp.limits,
  updated_at = now()
FROM public.sponsor_plans sp
WHERE ss.plan_id = sp.id
  AND sp.name = 'sponsor_studio'
  AND ss.status = 'active';

-- ---------------------------------------------------------------------------
-- 8. UPDATE AUTO-ASSIGN TRIGGER: new sponsors get sponsor_connect
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_sponsor_free_plan()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
DECLARE
  connect_plan_id UUID;
BEGIN
  SELECT id INTO connect_plan_id
  FROM public.sponsor_plans
  WHERE name = 'sponsor_connect'
  LIMIT 1;

  IF connect_plan_id IS NOT NULL THEN
    INSERT INTO public.sponsor_subscriptions (sponsor_id, plan_id, limits_snapshot)
    VALUES (
      new.id,
      connect_plan_id,
      (SELECT limits FROM public.sponsor_plans WHERE id = connect_plan_id)
    );
  END IF;

  RETURN new;
END;
$function$;

-- Trigger already exists (on_sponsor_created_assign_plan), no need to recreate —
-- it references the function by name, so the updated function is used automatically.
