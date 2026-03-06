-- =============================================================================
-- Add roles array to app_metadata for JWT-based role enforcement
-- =============================================================================
-- Stores user roles as an array in auth.users.raw_app_meta_data so middleware
-- can read them from the JWT without a database query. Supports dual-role users
-- (e.g. ["speaker", "sponsor"]).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update handle_new_user() to set roles in app_metadata on signup
-- ---------------------------------------------------------------------------

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

  -- Set roles array in app_metadata (available in JWT without DB query)
  UPDATE auth.users
  SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('roles', jsonb_build_array(signup_role))
  WHERE id = new.id;

  IF signup_role = 'sponsor' THEN
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

-- ---------------------------------------------------------------------------
-- 2. Helper function to append a role to a user's app_metadata.roles array
-- ---------------------------------------------------------------------------
-- Called by application code when a user adds a second role (e.g. speaker
-- becomes a sponsor). SECURITY DEFINER so it can update auth.users.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.append_user_role(target_user_id UUID, new_role TEXT)
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
DECLARE
  current_roles JSONB;
BEGIN
  SELECT coalesce(raw_app_meta_data->'roles', '[]'::jsonb)
  INTO current_roles
  FROM auth.users
  WHERE id = target_user_id;

  -- Only append if not already present
  IF NOT current_roles @> to_jsonb(new_role) THEN
    UPDATE auth.users
    SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('roles', current_roles || to_jsonb(new_role))
    WHERE id = target_user_id;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Backfill existing users with roles based on their current table presence
-- ---------------------------------------------------------------------------

-- Speakers who are NOT also sponsors
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"roles": ["speaker"]}'::jsonb
WHERE id IN (SELECT auth_user_id FROM public.speakers)
  AND id NOT IN (SELECT auth_user_id FROM public.sponsor_accounts)
  AND NOT (coalesce(raw_app_meta_data, '{}'::jsonb) ? 'roles');

-- Sponsors who are NOT also speakers
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"roles": ["sponsor"]}'::jsonb
WHERE id IN (SELECT auth_user_id FROM public.sponsor_accounts)
  AND id NOT IN (SELECT auth_user_id FROM public.speakers)
  AND NOT (coalesce(raw_app_meta_data, '{}'::jsonb) ? 'roles');

-- Dual-role users (have rows in both tables)
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"roles": ["speaker", "sponsor"]}'::jsonb
WHERE id IN (SELECT auth_user_id FROM public.speakers)
  AND id IN (SELECT auth_user_id FROM public.sponsor_accounts)
  AND NOT (coalesce(raw_app_meta_data, '{}'::jsonb) ? 'roles');
