-- Wire the existing 'advanced_reporting' feature flag to the Enterprise plan.
-- This flag was seeded in 20260218120000 but never assigned to any plan.
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, f.id
FROM public.plans p, public.feature_flags f
WHERE p.name = 'enterprise'
  AND f.key = 'advanced_reporting'
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;
