-- Rename sponsor_campaign_kols → sponsor_campaign_speakers
-- Idempotent: checks for table existence before renaming.

-- 1. Rename the table (only if old name exists and new name does not)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sponsor_campaign_kols')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sponsor_campaign_speakers')
  THEN
    ALTER TABLE public.sponsor_campaign_kols RENAME TO sponsor_campaign_speakers;
  END IF;
END $$;

-- 2. Rename indexes (only if old name exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sponsor_campaign_kols_campaign') THEN
    ALTER INDEX idx_sponsor_campaign_kols_campaign RENAME TO idx_sponsor_campaign_speakers_campaign;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sponsor_campaign_kols_speaker') THEN
    ALTER INDEX idx_sponsor_campaign_kols_speaker RENAME TO idx_sponsor_campaign_speakers_speaker;
  END IF;
END $$;

-- 3. Rename RLS policies on the (now-renamed) table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sponsor_campaign_speakers'
      AND policyname = 'Sponsors can manage own campaign KOLs'
  ) THEN
    ALTER POLICY "Sponsors can manage own campaign KOLs"
      ON public.sponsor_campaign_speakers
      RENAME TO "Sponsors can manage own campaign speakers";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sponsor_campaign_speakers'
      AND policyname = 'Service role can manage sponsor_campaign_kols'
  ) THEN
    ALTER POLICY "Service role can manage sponsor_campaign_kols"
      ON public.sponsor_campaign_speakers
      RENAME TO "Service role can manage sponsor_campaign_speakers";
  END IF;
END $$;
