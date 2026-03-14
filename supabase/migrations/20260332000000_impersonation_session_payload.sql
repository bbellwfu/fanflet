-- Store impersonation session payload (JWT + user) in DB for URL-keyed per-tab sessions.
-- When __imp=<session_id> is in the URL, middleware and server client load this payload
-- so each tab can have a different impersonation session (no cookie sharing).

ALTER TABLE public.impersonation_sessions
  ADD COLUMN IF NOT EXISTS session_payload JSONB;

COMMENT ON COLUMN public.impersonation_sessions.session_payload IS
  'Server-stored session (access_token, user) for __imp URL param; cleared on session end.';
