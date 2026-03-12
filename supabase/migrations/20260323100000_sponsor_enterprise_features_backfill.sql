-- Backfill: ensure sponsor_enterprise has sponsor_resource_library and sponsor_campaigns
-- in sponsor_plan_features. Idempotent; safe when 20260321000000 / 20260322000000
-- did not run or ran in an unexpected order.

-- Ensure feature flags exist
INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES
  ('sponsor_resource_library', 'Sponsor resource library and catalog', false),
  ('sponsor_campaigns', 'Sponsor campaign management', false)
ON CONFLICT (key) DO NOTHING;

-- Wire both features to sponsor_enterprise plan
INSERT INTO public.sponsor_plan_features (plan_id, feature_flag_id)
SELECT sp.id, ff.id
FROM public.sponsor_plans sp
CROSS JOIN public.feature_flags ff
WHERE sp.name = 'sponsor_enterprise'
  AND ff.key IN ('sponsor_resource_library', 'sponsor_campaigns')
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;
