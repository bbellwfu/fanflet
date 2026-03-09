-- Migration: Add mcp_access feature flag and assign to Pro, Early Access, and Enterprise plans
-- MCP access is gated behind subscription tiers — Free users cannot use MCP.

-- Insert feature flag (idempotent)
INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES ('mcp_access', 'MCP AI Assistant Access', false)
ON CONFLICT (key) DO NOTHING;

-- Assign mcp_access to Pro plan
INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, ff.id
FROM public.plans p, public.feature_flags ff
WHERE p.name = 'pro' AND ff.key = 'mcp_access'
ON CONFLICT DO NOTHING;

-- Assign mcp_access to Enterprise plan
INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, ff.id
FROM public.plans p, public.feature_flags ff
WHERE p.name = 'enterprise' AND ff.key = 'mcp_access'
ON CONFLICT DO NOTHING;

-- Assign mcp_access to Early Access plan
INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, ff.id
FROM public.plans p, public.feature_flags ff
WHERE p.name = 'early_access' AND ff.key = 'mcp_access'
ON CONFLICT DO NOTHING;

-- Refresh entitlement snapshots so existing subscribers pick up the new feature.
-- Uses the same trigger logic: overwrites features_snapshot with current plan features.
UPDATE public.speaker_subscriptions ss
SET features_snapshot = (
  SELECT array_agg(ff.key ORDER BY ff.key)
  FROM public.plan_features pf
  JOIN public.feature_flags ff ON ff.id = pf.feature_flag_id
  WHERE pf.plan_id = ss.plan_id
)
WHERE ss.status = 'active'
  AND ss.plan_id IN (
    SELECT p.id FROM public.plans p
    WHERE p.name IN ('pro', 'enterprise', 'early_access')
  );
