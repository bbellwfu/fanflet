-- =============================================================================
-- Fix handle_new_user() trigger: skip speaker row creation for sponsor signups
-- =============================================================================
-- The previous trigger unconditionally inserted into public.speakers for every
-- auth.users row, including sponsor signups (signup_role = 'sponsor').
-- This caused phantom "Unnamed" speaker rows for sponsor-only users.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
BEGIN
  IF coalesce(new.raw_user_meta_data->>'signup_role', '') = 'sponsor' THEN
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

-- =============================================================================
-- Clean up orphaned speaker rows for sponsor-only users
-- =============================================================================
-- Delete speakers whose auth_user_id exists in sponsor_accounts AND who have
-- no fanflets (i.e. they never used the speaker side of the product).
-- The CASCADE on speaker_subscriptions handles any early-access rows.
-- =============================================================================

DELETE FROM public.speakers
WHERE auth_user_id IN (SELECT auth_user_id FROM public.sponsor_accounts)
  AND id NOT IN (SELECT DISTINCT speaker_id FROM public.fanflets);
