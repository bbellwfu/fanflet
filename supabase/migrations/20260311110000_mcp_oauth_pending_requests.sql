-- Short-lived pending OAuth authorize requests (authorize -> login -> callback).
-- Only service role can read/write; rows are deleted after use or when expired.

CREATE TABLE IF NOT EXISTS public.mcp_oauth_pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redirect_uri TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  code_challenge TEXT NOT NULL,
  state TEXT,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_pending_requests_created
  ON public.mcp_oauth_pending_requests(created_at);

ALTER TABLE public.mcp_oauth_pending_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages MCP pending requests" ON public.mcp_oauth_pending_requests;
CREATE POLICY "Service role manages MCP pending requests"
  ON public.mcp_oauth_pending_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);
