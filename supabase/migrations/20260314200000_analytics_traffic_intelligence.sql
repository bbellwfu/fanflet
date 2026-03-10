-- Analytics traffic intelligence: bot detection, geo capture, referrer classification.
-- Adds columns to support filtering bot traffic, geographic analysis,
-- and insert-time referrer categorization.

-- Bot detection flag
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_analytics_events_is_bot
  ON public.analytics_events(is_bot) WHERE is_bot = false;

-- Geographic data (from Vercel geo headers — no IP stored)
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_events_country
  ON public.analytics_events(country_code);

-- Insert-time referrer classification
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS referrer_category TEXT;

CREATE INDEX IF NOT EXISTS idx_analytics_events_referrer_category
  ON public.analytics_events(referrer_category);
