-- Add demo_environment_id to speakers and sponsor_accounts for sandbox isolation.
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.

ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS demo_environment_id UUID
  REFERENCES public.demo_environments(id) ON DELETE SET NULL;

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS demo_environment_id UUID
  REFERENCES public.demo_environments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_speakers_demo_env
  ON public.speakers(demo_environment_id) WHERE demo_environment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_demo_env
  ON public.sponsor_accounts(demo_environment_id) WHERE demo_environment_id IS NOT NULL;
