-- =============================================================================
-- AI Utilization Tracking
-- =============================================================================
-- Centralized logging for all AI API usage to track costs, purposes, and usage patterns.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- The admin who triggered the AI feature
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Metadata about the feature and model
  feature_name TEXT NOT NULL, -- e.g. 'communication_rewrite', 'demo_generation'
  model TEXT NOT NULL,        -- e.g. 'claude-3-haiku-20240307'
  
  -- Token usage (from Anthropic response)
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Cost tracking
  estimated_cost_usd NUMERIC(10, 6),
  
  -- Operational context
  context JSONB DEFAULT '{}', -- e.g. { "prospect_name": "...", "target_field": "..." }
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,
  
  -- API Response ID for cross-referencing if needed
  provider_request_id TEXT
);

-- Indexes for performance and reporting
CREATE INDEX idx_ai_usage_logs_admin ON public.ai_usage_logs(admin_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_feature ON public.ai_usage_logs(feature_name, created_at DESC);
CREATE INDEX idx_ai_usage_logs_created ON public.ai_usage_logs(created_at DESC);

-- Security: Service role managed, Admins (super_admin) can read for reporting
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages ai usage logs" ON public.ai_usage_logs;
CREATE POLICY "Service role manages ai usage logs"
  ON public.ai_usage_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can read ai usage logs" ON public.ai_usage_logs;
CREATE POLICY "Super admins can read ai usage logs"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = (SELECT auth.uid())
        AND role = 'super_admin'
        AND removed_at IS NULL
    )
  );

COMMENT ON TABLE public.ai_usage_logs IS 'Logs for platform-wide AI usage tracking and cost management.';
