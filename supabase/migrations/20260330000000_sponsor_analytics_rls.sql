-- Migration: Sponsor Analytics Visibility
-- Grants sponsors SELECT access to analytics_events, fanflets, and resource_blocks
-- for content they are associated with (via block attribution or explicit connection).
-- This fixes missing metrics in the sponsor portal for draft/demo content.

-- Helper function: returns fanflet IDs associated with a sponsor (by auth uid).
-- SECURITY DEFINER bypasses RLS on resource_blocks and fanflet_sponsors, which
-- breaks the circular RLS dependency: fanflets → resource_blocks → fanflets.
CREATE OR REPLACE FUNCTION public.fanflet_ids_for_sponsor(sponsor_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT fanflet_id FROM resource_blocks
  WHERE sponsor_account_id IN (SELECT id FROM sponsor_accounts WHERE auth_user_id = sponsor_uid)
  UNION
  SELECT DISTINCT fanflet_id FROM fanflet_sponsors
  WHERE sponsor_id IN (SELECT id FROM sponsor_accounts WHERE auth_user_id = sponsor_uid)
$$;

-- 1. ANALYTICS_EVENTS: sponsors can read events for their associated fanflets and blocks
DROP POLICY IF EXISTS "Sponsors can read analytics for their content" ON public.analytics_events;
CREATE POLICY "Sponsors can read analytics for their content"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (
    -- Resource clicks for blocks attributed to this sponsor
    (event_type = 'resource_click' AND resource_block_id IN (
      SELECT id FROM public.resource_blocks
      WHERE sponsor_account_id IN (
        SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
      )
    ))
    OR
    -- Page views for fanflets where this sponsor has content or is explicitly listed
    (event_type = 'page_view' AND fanflet_id IN (
      SELECT public.fanflet_ids_for_sponsor(auth.uid())
    ))
  );

-- 2. FANFLETS: allow sponsors to see draft fanflets they are connected to.
-- Uses fanflet_ids_for_sponsor() to avoid circular RLS with resource_blocks.
DROP POLICY IF EXISTS "Sponsors can read draft fanflets they are connected to" ON public.fanflets;
CREATE POLICY "Sponsors can read draft fanflets they are connected to"
  ON public.fanflets FOR SELECT TO authenticated
  USING (
    status = 'draft' AND id IN (SELECT public.fanflet_ids_for_sponsor(auth.uid()))
  );

-- 3. RESOURCE_BLOCKS: allow sponsors to see blocks on fanflets they are connected to.
-- Does NOT subquery fanflets — checks sponsor association directly to avoid recursion.
DROP POLICY IF EXISTS "Sponsors can read blocks on draft fanflets" ON public.resource_blocks;
DROP POLICY IF EXISTS "Sponsors can read blocks on connected fanflets" ON public.resource_blocks;
CREATE POLICY "Sponsors can read blocks on connected fanflets"
  ON public.resource_blocks FOR SELECT TO authenticated
  USING (
    -- Direct: block is attributed to this sponsor
    sponsor_account_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
    )
    OR
    -- Indirect: block is on a fanflet where this sponsor is explicitly listed
    fanflet_id IN (
      SELECT fanflet_id FROM public.fanflet_sponsors
      WHERE sponsor_id IN (
        SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
      )
    )
  );
