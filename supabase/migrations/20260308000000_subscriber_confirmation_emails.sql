-- =============================================================================
-- SUBSCRIBER CONFIRMATION EMAILS
-- Add per-fanflet email confirmation settings
-- =============================================================================
-- When NULL, the fanflet inherits the speaker's default confirmation email
-- settings from speakers.social_links.confirmation_email
-- Structure: { enabled?: boolean, subject?: string, body?: string }
-- =============================================================================

ALTER TABLE public.fanflets
  ADD COLUMN IF NOT EXISTS confirmation_email_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.fanflets.confirmation_email_config IS 
  'Per-fanflet email confirmation override. NULL = use speaker default from social_links.confirmation_email';
