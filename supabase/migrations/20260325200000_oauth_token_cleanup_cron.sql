-- Enable pg_cron and schedule daily cleanup of expired OAuth tokens
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role (required by Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule daily cleanup at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-expired-oauth-tokens',
  '0 3 * * *',
  $$
    DELETE FROM public.mcp_oauth_codes WHERE expires_at < now();
    DELETE FROM public.mcp_oauth_tokens WHERE expires_at < now();
  $$
);
