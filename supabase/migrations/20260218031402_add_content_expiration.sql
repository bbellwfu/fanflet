-- Content expiration: add columns to fanflets (idempotent)
ALTER TABLE public.fanflets ADD COLUMN IF NOT EXISTS expiration_date date;
ALTER TABLE public.fanflets ADD COLUMN IF NOT EXISTS expiration_preset text NOT NULL DEFAULT 'none';
ALTER TABLE public.fanflets DROP CONSTRAINT IF EXISTS fanflets_expiration_preset_check;
ALTER TABLE public.fanflets ADD CONSTRAINT fanflets_expiration_preset_check
  CHECK (expiration_preset IN ('30d', '60d', '90d', 'none', 'custom'));
ALTER TABLE public.fanflets ADD COLUMN IF NOT EXISTS show_expiration_notice boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_fanflets_expiration_date ON public.fanflets(expiration_date);
