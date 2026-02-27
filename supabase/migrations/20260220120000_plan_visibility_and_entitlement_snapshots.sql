-- Add plan visibility control and entitlement snapshot columns.
-- is_public controls whether a plan appears on the public pricing page.
-- limits_snapshot / features_snapshot freeze entitlements at subscription time.
-- Idempotent: safe to run multiple times.

-- =============================================================================
-- 1. plans: add is_public flag
-- =============================================================================
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_plans_is_public ON public.plans(is_public);

-- Set existing user-facing plans to public
UPDATE public.plans SET is_public = true WHERE name IN ('free', 'pro', 'enterprise');

-- =============================================================================
-- 2. speaker_subscriptions: add entitlement snapshot columns
-- =============================================================================
ALTER TABLE public.speaker_subscriptions
  ADD COLUMN IF NOT EXISTS limits_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS features_snapshot TEXT[];

-- =============================================================================
-- 3. Anonymous / public read policy for plans (pricing page needs it)
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can read public plans" ON public.plans;
CREATE POLICY "Anyone can read public plans"
  ON public.plans FOR SELECT
  TO anon
  USING (is_public = true);

-- =============================================================================
-- 4. Update trigger: snapshot entitlements when a new subscription is created
-- =============================================================================
CREATE OR REPLACE FUNCTION public.snapshot_entitlements_on_subscribe()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.speaker_subscriptions
  SET
    limits_snapshot = (SELECT limits FROM public.plans WHERE id = NEW.plan_id),
    features_snapshot = ARRAY(
      SELECT f.key
      FROM public.plan_features pf
      JOIN public.feature_flags f ON f.id = pf.feature_flag_id
      WHERE pf.plan_id = NEW.plan_id
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_snapshot_entitlements ON public.speaker_subscriptions;
CREATE TRIGGER on_subscription_snapshot_entitlements
  AFTER INSERT ON public.speaker_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_entitlements_on_subscribe();

-- =============================================================================
-- 5. Update existing trigger: also snapshot when assigning early access
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
