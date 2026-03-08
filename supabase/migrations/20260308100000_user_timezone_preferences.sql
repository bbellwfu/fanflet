-- Add timezone preference columns for all user types.
-- Stores IANA timezone identifiers (e.g. 'America/New_York').
-- NULL means "not yet set" — the app falls back to browser-detected timezone.

ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;

ALTER TABLE public.admin_notification_preferences
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;
