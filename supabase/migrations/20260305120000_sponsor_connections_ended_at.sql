-- End sponsor connection without losing historical data.
-- ended_at: after this time, no new sponsor_leads are attributed; blocks stay linked for reporting.
-- hidden_by_*: optional "remove from my view" without deleting data.

ALTER TABLE public.sponsor_connections
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.sponsor_connections
  ADD COLUMN IF NOT EXISTS hidden_by_sponsor BOOLEAN DEFAULT false;

ALTER TABLE public.sponsor_connections
  ADD COLUMN IF NOT EXISTS hidden_by_speaker BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sponsor_connections_ended_at
  ON public.sponsor_connections(ended_at)
  WHERE ended_at IS NOT NULL;
