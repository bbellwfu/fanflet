-- Add optional default sponsor link to resource_library for sponsor-type items.
-- When a block is added from library to a fanflet, the block can be pre-linked to this sponsor
-- if the speaker still has an active connection. Idempotent.

ALTER TABLE public.resource_library
  ADD COLUMN IF NOT EXISTS default_sponsor_account_id UUID
    REFERENCES public.sponsor_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resource_library_default_sponsor
  ON public.resource_library(default_sponsor_account_id)
  WHERE default_sponsor_account_id IS NOT NULL;
