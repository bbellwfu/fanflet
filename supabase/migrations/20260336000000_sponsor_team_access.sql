-- =============================================================================
-- Sponsor Multi-User Team Access (FAN-9)
-- =============================================================================
-- Adds team members and invitations tables. Creates a helper function
-- sponsor_ids_for_user() that returns sponsor IDs accessible via ownership
-- OR team membership. Updates all sponsor RLS policies to use it.
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SPONSOR TEAM MEMBERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sponsor_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'campaign_manager', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(sponsor_id, auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_team_members_sponsor
  ON public.sponsor_team_members(sponsor_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_team_members_user
  ON public.sponsor_team_members(auth_user_id);

ALTER TABLE public.sponsor_team_members ENABLE ROW LEVEL SECURITY;

-- Team members can read their own team
DROP POLICY IF EXISTS "Team members can read own team" ON public.sponsor_team_members;
CREATE POLICY "Team members can read own team"
  ON public.sponsor_team_members FOR SELECT TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
    OR auth_user_id = (SELECT auth.uid())
    OR sponsor_id IN (
      SELECT sponsor_id FROM public.sponsor_team_members WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Only sponsor owner and team admins can manage team members
DROP POLICY IF EXISTS "Admins can manage team members" ON public.sponsor_team_members;
CREATE POLICY "Admins can manage team members"
  ON public.sponsor_team_members FOR INSERT TO authenticated
  WITH CHECK (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
    OR sponsor_id IN (
      SELECT sponsor_id FROM public.sponsor_team_members
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update team members" ON public.sponsor_team_members;
CREATE POLICY "Admins can update team members"
  ON public.sponsor_team_members FOR UPDATE TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
    OR sponsor_id IN (
      SELECT sponsor_id FROM public.sponsor_team_members
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete team members" ON public.sponsor_team_members;
CREATE POLICY "Admins can delete team members"
  ON public.sponsor_team_members FOR DELETE TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
    OR sponsor_id IN (
      SELECT sponsor_id FROM public.sponsor_team_members
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
    )
    -- Members can remove themselves
    OR auth_user_id = (SELECT auth.uid())
  );

-- Service role manages team members (admin impersonation, etc.)
DROP POLICY IF EXISTS "Service role manages team members" ON public.sponsor_team_members;
CREATE POLICY "Service role manages team members"
  ON public.sponsor_team_members FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. SPONSOR TEAM INVITATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sponsor_team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'campaign_manager', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(sponsor_id, email, status)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_team_invitations_sponsor
  ON public.sponsor_team_invitations(sponsor_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_team_invitations_email
  ON public.sponsor_team_invitations(email);

CREATE INDEX IF NOT EXISTS idx_sponsor_team_invitations_token
  ON public.sponsor_team_invitations(token);

ALTER TABLE public.sponsor_team_invitations ENABLE ROW LEVEL SECURITY;

-- Team admins and owner can manage invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.sponsor_team_invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.sponsor_team_invitations FOR ALL TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
    OR sponsor_id IN (
      SELECT sponsor_id FROM public.sponsor_team_members
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
    )
    OR sponsor_id IN (
      SELECT sponsor_id FROM public.sponsor_team_members
      WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Service role manages invitations
DROP POLICY IF EXISTS "Service role manages invitations" ON public.sponsor_team_invitations;
CREATE POLICY "Service role manages invitations"
  ON public.sponsor_team_invitations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. HELPER FUNCTION: sponsor_ids_for_user(uid)
-- ---------------------------------------------------------------------------
-- Returns all sponsor account IDs accessible by a given auth user,
-- via direct ownership OR team membership.

CREATE OR REPLACE FUNCTION public.sponsor_ids_for_user(uid UUID)
  RETURNS SETOF UUID
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
AS $$
  SELECT id FROM public.sponsor_accounts WHERE auth_user_id = uid
  UNION
  SELECT sponsor_id FROM public.sponsor_team_members WHERE auth_user_id = uid
$$;

-- ---------------------------------------------------------------------------
-- 4. UPDATE RLS POLICIES — sponsor_accounts
-- ---------------------------------------------------------------------------

-- Use sponsor_ids_for_user() (SECURITY DEFINER) to avoid infinite RLS recursion
-- between sponsor_accounts and sponsor_team_members policies.
DROP POLICY IF EXISTS "Sponsors can manage own account" ON public.sponsor_accounts;
CREATE POLICY "Sponsors can manage own account"
  ON public.sponsor_accounts FOR ALL TO authenticated
  USING (id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read verified sponsors" ON public.sponsor_accounts;
CREATE POLICY "Authenticated can read verified sponsors"
  ON public.sponsor_accounts FOR SELECT TO authenticated
  USING (
    is_verified = true
    OR id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid())))
  );

-- ---------------------------------------------------------------------------
-- 5. UPDATE RLS POLICIES — sponsor_connections
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can manage own connections" ON public.sponsor_connections;
CREATE POLICY "Sponsors can manage own connections"
  ON public.sponsor_connections FOR ALL TO authenticated
  USING (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))))
  WITH CHECK (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- ---------------------------------------------------------------------------
-- 6. UPDATE RLS POLICIES — sponsor_resources
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can manage own resources" ON public.sponsor_resources;
CREATE POLICY "Sponsors can manage own resources"
  ON public.sponsor_resources FOR ALL TO authenticated
  USING (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))))
  WITH CHECK (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- ---------------------------------------------------------------------------
-- 7. UPDATE RLS POLICIES — sponsor_leads
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can read own leads" ON public.sponsor_leads;
CREATE POLICY "Sponsors can read own leads"
  ON public.sponsor_leads FOR SELECT TO authenticated
  USING (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- ---------------------------------------------------------------------------
-- 8. UPDATE RLS POLICIES — sponsor_campaigns
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can manage own campaigns" ON public.sponsor_campaigns;
CREATE POLICY "Sponsors can manage own campaigns"
  ON public.sponsor_campaigns FOR ALL TO authenticated
  USING (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))))
  WITH CHECK (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- ---------------------------------------------------------------------------
-- 9. UPDATE RLS POLICIES — sponsor_subscriptions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can read own subscription" ON public.sponsor_subscriptions;
CREATE POLICY "Sponsors can read own subscription"
  ON public.sponsor_subscriptions FOR SELECT TO authenticated
  USING (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- ---------------------------------------------------------------------------
-- 10. UPDATE RLS POLICIES — sponsor_resource_library
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can manage own library" ON public.sponsor_resource_library;
CREATE POLICY "Sponsors can manage own library"
  ON public.sponsor_resource_library FOR ALL TO authenticated
  USING (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))))
  WITH CHECK (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- ---------------------------------------------------------------------------
-- 11. UPDATE RLS POLICIES — sponsor_campaign_speakers
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can manage campaign speakers" ON public.sponsor_campaign_speakers;
CREATE POLICY "Sponsors can manage campaign speakers"
  ON public.sponsor_campaign_speakers FOR ALL TO authenticated
  USING (campaign_id IN (
    SELECT id FROM public.sponsor_campaigns
    WHERE sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid())))
  ))
  WITH CHECK (campaign_id IN (
    SELECT id FROM public.sponsor_campaigns
    WHERE sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid())))
  ));

-- ---------------------------------------------------------------------------
-- 12. UPDATE RLS POLICIES — sponsor_resource_campaigns
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Sponsors can manage resource campaigns" ON public.sponsor_resource_campaigns;
CREATE POLICY "Sponsors can manage resource campaigns"
  ON public.sponsor_resource_campaigns FOR ALL TO authenticated
  USING (campaign_id IN (
    SELECT id FROM public.sponsor_campaigns
    WHERE sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid())))
  ))
  WITH CHECK (campaign_id IN (
    SELECT id FROM public.sponsor_campaigns
    WHERE sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid())))
  ));
