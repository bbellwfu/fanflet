-- Backfill speaker_subscriptions: assign Early Access plan to all existing
-- speakers that do not yet have a subscription (e.g. created before the
-- plans migration or before the trigger existed).
-- Idempotent: safe to run multiple times.

INSERT INTO public.speaker_subscriptions (speaker_id, plan_id, status)
SELECT s.id, p.id, 'active'
FROM public.speakers s
CROSS JOIN public.plans p
WHERE p.name = 'early_access' AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.speaker_subscriptions ss
    WHERE ss.speaker_id = s.id
  )
ON CONFLICT (speaker_id) DO NOTHING;
