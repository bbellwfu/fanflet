-- Migration: Tighten resource_blocks RLS for multi-sponsor data isolation
-- FAN-7: Sponsors could previously read ALL blocks on draft fanflets where they
-- had content, including blocks attributed to competing sponsors. This replaces
-- the broad policy with one scoped to only the sponsor's own blocks.

-- Drop the broad policy that exposes all blocks on shared draft fanflets
DROP POLICY IF EXISTS "Sponsors can read blocks on draft fanflets" ON public.resource_blocks;

-- Sponsors can only read blocks attributed to their own account
DROP POLICY IF EXISTS "Sponsors can read their own attributed blocks" ON public.resource_blocks;
CREATE POLICY "Sponsors can read their own attributed blocks"
  ON public.resource_blocks FOR SELECT TO authenticated
  USING (
    sponsor_account_id IN (
      SELECT id FROM public.sponsor_accounts
      WHERE auth_user_id = auth.uid()
    )
  );
