-- =============================================================================
-- Sponsor entitlement model
-- =============================================================================
-- Mirrors the speaker plan/subscription architecture for sponsors.
-- Sponsors get plans with limits (max_connections, max_resources, storage_mb)
-- and a subscription row linking them to a plan.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SPONSOR PLANS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sponsor_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  price_monthly_cents INT DEFAULT 0 NOT NULL,
  limits JSONB DEFAULT '{}'::jsonb NOT NULL,
  is_public BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.sponsor_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read public sponsor plans" ON public.sponsor_plans;
CREATE POLICY "Anyone can read public sponsor plans"
  ON public.sponsor_plans FOR SELECT TO anon, authenticated
  USING (is_public = true OR is_active = true);

DROP POLICY IF EXISTS "Service role manages sponsor plans" ON public.sponsor_plans;
CREATE POLICY "Service role manages sponsor plans"
  ON public.sponsor_plans FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Seed default sponsor plans
INSERT INTO public.sponsor_plans (name, display_name, description, sort_order, limits, is_public)
VALUES
  ('sponsor_free', 'Sponsor Free', 'Get started with basic sponsorship features', 0,
   '{"max_connections": 3, "max_resources": 5, "storage_mb": 50}'::jsonb, true),
  ('sponsor_pro', 'Sponsor Pro', 'Expanded reach and resource sharing', 1,
   '{"max_connections": -1, "max_resources": -1, "storage_mb": 500}'::jsonb, true),
  ('sponsor_enterprise', 'Sponsor Enterprise', 'Full platform access with dedicated support', 2,
   '{"max_connections": -1, "max_resources": -1, "storage_mb": 5000}'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. SPONSOR SUBSCRIPTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sponsor_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id UUID REFERENCES public.sponsor_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  limits_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.sponsor_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sponsors can read own subscription" ON public.sponsor_subscriptions;
CREATE POLICY "Sponsors can read own subscription"
  ON public.sponsor_subscriptions FOR SELECT TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Service role manages sponsor subscriptions" ON public.sponsor_subscriptions;
CREATE POLICY "Service role manages sponsor subscriptions"
  ON public.sponsor_subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. Auto-assign free plan on sponsor account creation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_sponsor_free_plan()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id
  FROM public.sponsor_plans
  WHERE name = 'sponsor_free'
  LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.sponsor_subscriptions (sponsor_id, plan_id, limits_snapshot)
    VALUES (
      new.id,
      free_plan_id,
      (SELECT limits FROM public.sponsor_plans WHERE id = free_plan_id)
    );
  END IF;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS on_sponsor_created_assign_plan ON public.sponsor_accounts;
CREATE TRIGGER on_sponsor_created_assign_plan
  AFTER INSERT ON public.sponsor_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_sponsor_free_plan();
