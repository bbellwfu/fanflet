-- Integration Framework: connections and event logging for sponsor CRM/marketing integrations.
-- Also adds enterprise_integrations feature flag for sponsor entitlements.
--
-- Tables:
--   integration_connections — stores per-sponsor integration configs and encrypted tokens
--   integration_events     — logs every push attempt with status and retry tracking
--
-- Idempotent: safe to run more than once.

-- ============================================================
-- 1. integration_connections
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL
    CHECK (platform IN ('hubspot', 'mailchimp', 'pipedrive', 'google_sheets', 'airtable', 'zapier')),
  status TEXT NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'disconnected', 'degraded', 'expired')),

  -- Encrypted via Supabase Vault (pgsodium) or application-level encryption.
  -- Store Vault secret references rather than raw tokens in production.
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Non-sensitive, platform-specific configuration
  settings JSONB DEFAULT '{}',

  -- Zapier-type integrations: webhook URL(s)
  webhook_urls JSONB DEFAULT '[]',

  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT uq_sponsor_platform UNIQUE (sponsor_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_sponsor
  ON public.integration_connections(sponsor_id);

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

-- Sponsors can manage their own integration connections
DROP POLICY IF EXISTS "Sponsors manage own integrations" ON public.integration_connections;
CREATE POLICY "Sponsors manage own integrations"
  ON public.integration_connections FOR ALL TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts
      WHERE auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Service role for background jobs and integration adapters
DROP POLICY IF EXISTS "Service role manages integrations" ON public.integration_connections;
CREATE POLICY "Service role manages integrations"
  ON public.integration_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ============================================================
-- 2. integration_events
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integration_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,

  -- The data that was pushed (sanitized for logging — no PII)
  payload JSONB DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integration_events_sponsor
  ON public.integration_events(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_connection
  ON public.integration_events(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_status
  ON public.integration_events(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_integration_events_created
  ON public.integration_events(created_at);

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

-- Sponsors can read their own integration events (push history)
DROP POLICY IF EXISTS "Sponsors read own integration events" ON public.integration_events;
CREATE POLICY "Sponsors read own integration events"
  ON public.integration_events FOR SELECT TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts
      WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Service role for writing events from background jobs
DROP POLICY IF EXISTS "Service role manages integration events" ON public.integration_events;
CREATE POLICY "Service role manages integration events"
  ON public.integration_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ============================================================
-- 3. enterprise_integrations feature flag
-- ============================================================
-- Add to the feature_flags table for sponsor entitlement gating.
-- Uses INSERT ... ON CONFLICT to be idempotent.

INSERT INTO public.feature_flags (key, display_name, description, is_global)
VALUES (
  'enterprise_integrations',
  'Enterprise Integrations',
  'Access to CRM and marketing platform integrations in the Sponsor Portal',
  false
)
ON CONFLICT (key) DO NOTHING;
