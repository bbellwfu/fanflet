-- =============================================================================
-- Sponsor Audit Log (Phase 8B)
-- =============================================================================
-- Sponsor-facing activity log for Studio sponsors. Tracks mutations across
-- settings, team, campaigns, connections, library, and integrations.
-- Feature-gated behind sponsor_audit_log flag. 12-month retention.
-- Idempotent: safe to run multiple times.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'settings', 'team', 'campaigns', 'connections',
    'library', 'leads', 'integrations', 'billing'
  )),
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_audit_log_sponsor_created
  ON public.sponsor_audit_log(sponsor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sponsor_audit_log_actor
  ON public.sponsor_audit_log(actor_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_audit_log_category
  ON public.sponsor_audit_log(category, created_at DESC);

ALTER TABLE public.sponsor_audit_log ENABLE ROW LEVEL SECURITY;

-- Team members can read their sponsor's audit log
DROP POLICY IF EXISTS "Team can read sponsor audit log" ON public.sponsor_audit_log;
CREATE POLICY "Team can read sponsor audit log"
  ON public.sponsor_audit_log FOR SELECT TO authenticated
  USING (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- Inserts via server actions (authenticated user context)
DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.sponsor_audit_log;
CREATE POLICY "Authenticated can insert audit log"
  ON public.sponsor_audit_log FOR INSERT TO authenticated
  WITH CHECK (sponsor_id IN (SELECT public.sponsor_ids_for_user((SELECT auth.uid()))));

-- Service role full access
DROP POLICY IF EXISTS "Service role manages audit log" ON public.sponsor_audit_log;
CREATE POLICY "Service role manages audit log"
  ON public.sponsor_audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Auto-cleanup: entries older than 12 months (run via pg_cron or manual)
-- This creates a function that can be called to purge old entries.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_sponsor_audit_log()
  RETURNS INTEGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.sponsor_audit_log
  WHERE created_at < now() - interval '12 months';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
