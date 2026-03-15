-- Add return_path column for per-session return URL
ALTER TABLE public.impersonation_sessions
  ADD COLUMN IF NOT EXISTS return_path TEXT;

-- Clean up accumulated test sessions:
-- 1. Clear sensitive data from all ended/expired sessions
UPDATE public.impersonation_sessions
SET saved_auth_cookies = NULL,
    session_payload = NULL
WHERE ended_at IS NOT NULL
   OR expires_at < now();

-- 2. End orphaned sessions (expired but never ended)
UPDATE public.impersonation_sessions
SET ended_at = now()
WHERE ended_at IS NULL
  AND expires_at < now();
