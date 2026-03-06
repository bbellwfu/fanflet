-- =============================================================================
-- Create user_roles table
-- =============================================================================
-- This table was referenced by the admin layout and RLS policies on
-- admin_notification_preferences but never formally created in migrations.
-- It stores platform-level roles (currently only platform_admin).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('platform_admin')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (auth_user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_auth_user
  ON public.user_roles(auth_user_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin operations)
DROP POLICY IF EXISTS "Service role manages user_roles" ON public.user_roles;
CREATE POLICY "Service role manages user_roles"
  ON public.user_roles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));
