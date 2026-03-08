-- Add source attribution to analytics_events so portfolio/organic/QR traffic can be distinguished.
-- Valid values: direct, qr, portfolio, share (future). Default 'direct' for existing rows.

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

CREATE INDEX IF NOT EXISTS idx_analytics_events_source
  ON public.analytics_events(source);
