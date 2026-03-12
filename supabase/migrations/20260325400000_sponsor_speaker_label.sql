-- Add configurable speaker label per sponsor account.
-- Sponsors can choose what to call speakers (e.g., "KOL", "speaker", "presenter").
-- Default: 'speaker'.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sponsor_accounts'
      AND column_name = 'speaker_label'
  ) THEN
    ALTER TABLE public.sponsor_accounts
      ADD COLUMN speaker_label TEXT NOT NULL DEFAULT 'speaker';
  END IF;
END $$;
