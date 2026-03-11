-- Add demo_type and sponsor_id columns to demo_environments so the same table
-- can track both speaker-focused and sponsor-focused demo environments.

ALTER TABLE public.demo_environments
  ADD COLUMN IF NOT EXISTS demo_type TEXT NOT NULL DEFAULT 'speaker'
    CHECK (demo_type IN ('speaker', 'sponsor'));

ALTER TABLE public.demo_environments
  ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE SET NULL;

-- Index for filtering by demo_type
CREATE INDEX IF NOT EXISTS idx_demo_environments_demo_type ON public.demo_environments(demo_type);
