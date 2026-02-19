-- Add optional tier interest to marketing signups (Pro vs Enterprise/Custom).
-- Idempotent.

ALTER TABLE public.marketing_subscribers
  ADD COLUMN IF NOT EXISTS interest_tier TEXT;

COMMENT ON COLUMN public.marketing_subscribers.interest_tier IS 'Optional: pro | enterprise when user chose a tier on the pricing page.';
