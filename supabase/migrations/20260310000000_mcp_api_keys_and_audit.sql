-- MCP API keys for bearer-token authentication
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  scopes TEXT[] DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'speaker'
    CHECK (role IN ('speaker', 'sponsor', 'admin', 'audience')),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_hash ON public.mcp_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_user ON public.mcp_api_keys(auth_user_id);

ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own API keys" ON public.mcp_api_keys;
CREATE POLICY "Users can manage own API keys"
  ON public.mcp_api_keys FOR ALL TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role manages API keys" ON public.mcp_api_keys;
CREATE POLICY "Service role manages API keys"
  ON public.mcp_api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- MCP audit log for all tool invocations
CREATE TABLE IF NOT EXISTS public.mcp_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  api_key_id UUID REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  input_summary JSONB DEFAULT '{}',
  result_status TEXT NOT NULL CHECK (result_status IN ('success', 'error', 'denied')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- Admin-specific columns
  admin_action BOOLEAN DEFAULT false,
  target_entity_type TEXT,
  target_entity_id UUID
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_user ON public.mcp_audit_log(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_created ON public.mcp_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_admin
  ON public.mcp_audit_log(admin_action, created_at)
  WHERE admin_action = true;
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_target
  ON public.mcp_audit_log(target_entity_type, target_entity_id)
  WHERE target_entity_id IS NOT NULL;

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own MCP audit logs" ON public.mcp_audit_log;
CREATE POLICY "Users can read own MCP audit logs"
  ON public.mcp_audit_log FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can read all MCP audit logs" ON public.mcp_audit_log;
CREATE POLICY "Admins can read all MCP audit logs"
  ON public.mcp_audit_log FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->'app_metadata'->>'role') = 'platform_admin'
  );

DROP POLICY IF EXISTS "Service role manages MCP audit logs" ON public.mcp_audit_log;
CREATE POLICY "Service role manages MCP audit logs"
  ON public.mcp_audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── OAuth 2.1 support tables ──

-- Dynamically registered OAuth clients (MCP clients like Claude, Cursor, etc.)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
  client_id TEXT PRIMARY KEY DEFAULT 'mcp_' || replace(gen_random_uuid()::text, '-', ''),
  client_secret TEXT,
  client_secret_expires_at BIGINT,
  client_id_issued_at BIGINT DEFAULT extract(epoch from now())::bigint,
  redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  client_name TEXT,
  client_uri TEXT,
  logo_uri TEXT,
  scope TEXT,
  grant_types TEXT[] DEFAULT '{authorization_code, refresh_token}',
  response_types TEXT[] DEFAULT '{code}',
  token_endpoint_auth_method TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages OAuth clients" ON public.mcp_oauth_clients;
CREATE POLICY "Service role manages OAuth clients"
  ON public.mcp_oauth_clients FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authorization codes (short-lived, single-use)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_codes (
  code TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  scope TEXT,
  state TEXT,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_expires ON public.mcp_oauth_codes(expires_at);

ALTER TABLE public.mcp_oauth_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages OAuth codes" ON public.mcp_oauth_codes;
CREATE POLICY "Service role manages OAuth codes"
  ON public.mcp_oauth_codes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Issued OAuth tokens
CREATE TABLE IF NOT EXISTS public.mcp_oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_access ON public.mcp_oauth_tokens(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_refresh ON public.mcp_oauth_tokens(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_user ON public.mcp_oauth_tokens(auth_user_id);

ALTER TABLE public.mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages OAuth tokens" ON public.mcp_oauth_tokens;
CREATE POLICY "Service role manages OAuth tokens"
  ON public.mcp_oauth_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);
