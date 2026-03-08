-- =============================================================================
-- Audience Accounts & Portfolio (Phase 1)
-- =============================================================================
-- Introduces persistent audience identity: audience_accounts table for users
-- who sign up from public fanflet pages, and audience_saved_fanflets for their
-- portfolio of attended/saved events.
-- =============================================================================

-- ============================================================================
-- 1. AUDIENCE ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audience_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  linkedin_profile JSONB,
  linkedin_consent_scope JSONB,
  consent_recorded_at TIMESTAMPTZ,
  privacy_policy_version TEXT,
  notification_prefs JSONB DEFAULT '{"new_fanflet_from_followed": true, "marketing": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audience_accounts_auth_user_id
  ON public.audience_accounts(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_audience_accounts_email
  ON public.audience_accounts(email);

CREATE INDEX IF NOT EXISTS idx_audience_accounts_deleted_at
  ON public.audience_accounts(deleted_at)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.audience_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audience members can manage own account" ON public.audience_accounts;
CREATE POLICY "Audience members can manage own account"
  ON public.audience_accounts FOR ALL TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role has full access to audience accounts" ON public.audience_accounts;
CREATE POLICY "Service role has full access to audience accounts"
  ON public.audience_accounts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 2. AUDIENCE SAVED FANFLETS (portfolio spine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audience_saved_fanflets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_account_id UUID REFERENCES public.audience_accounts(id) ON DELETE CASCADE NOT NULL,
  fanflet_id UUID REFERENCES public.fanflets(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  save_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (save_source IN ('auto_signup', 'manual')),
  UNIQUE(audience_account_id, fanflet_id)
);

CREATE INDEX IF NOT EXISTS idx_audience_saved_fanflets_audience
  ON public.audience_saved_fanflets(audience_account_id);

CREATE INDEX IF NOT EXISTS idx_audience_saved_fanflets_fanflet
  ON public.audience_saved_fanflets(fanflet_id);

ALTER TABLE public.audience_saved_fanflets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audience members can manage own saved fanflets" ON public.audience_saved_fanflets;
CREATE POLICY "Audience members can manage own saved fanflets"
  ON public.audience_saved_fanflets FOR ALL TO authenticated
  USING (
    audience_account_id = (
      SELECT id FROM public.audience_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    audience_account_id = (
      SELECT id FROM public.audience_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Service role has full access to audience saved fanflets" ON public.audience_saved_fanflets;
CREATE POLICY "Service role has full access to audience saved fanflets"
  ON public.audience_saved_fanflets FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. RLS: Audience members can read metadata of their saved fanflets
--    regardless of publish status (for portfolio display of archived fanflets)
-- ============================================================================

DROP POLICY IF EXISTS "Audience can read saved fanflet metadata" ON public.fanflets;
CREATE POLICY "Audience can read saved fanflet metadata"
  ON public.fanflets FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT asf.fanflet_id
      FROM public.audience_saved_fanflets asf
      JOIN public.audience_accounts aa ON aa.id = asf.audience_account_id
      WHERE aa.auth_user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 4. Update handle_new_user() to support audience signups
-- ============================================================================
-- Branching: sponsor → skip speaker row (existing)
--            audience → create audience_accounts row, skip speaker row (new)
--            default → create speaker row (existing)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
DECLARE
  signup_role TEXT;
BEGIN
  signup_role := coalesce(new.raw_user_meta_data->>'signup_role', 'speaker');

  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('roles', jsonb_build_array(signup_role))
  WHERE id = new.id;

  IF signup_role = 'sponsor' THEN
    RETURN new;
  END IF;

  IF signup_role = 'audience' THEN
    INSERT INTO public.audience_accounts (auth_user_id, email, display_name)
    VALUES (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
    );
    RETURN new;
  END IF;

  INSERT INTO public.speakers (auth_user_id, email, name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  RETURN new;
END;
$function$;
