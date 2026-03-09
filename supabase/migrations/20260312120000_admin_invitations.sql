-- =============================================================================
-- Admin invitations table
-- =============================================================================
-- Stores pending admin invitations with hashed tokens for secure acceptance.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'platform_admin'
    CHECK (role IN ('super_admin', 'platform_admin')),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Only one active (non-accepted) invitation per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_invitations_email_active
  ON public.admin_invitations(email)
  WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_admin_invitations_token
  ON public.admin_invitations(token_hash)
  WHERE accepted_at IS NULL;

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages admin invitations" ON public.admin_invitations;
CREATE POLICY "Service role manages admin invitations"
  ON public.admin_invitations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can read invitations" ON public.admin_invitations;
CREATE POLICY "Super admins can read invitations"
  ON public.admin_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = (SELECT auth.uid())
        AND role = 'super_admin'
        AND removed_at IS NULL
    )
  );
