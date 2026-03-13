-- Join table for explicit Fanflet-Sponsor mapping (e.g. sponsor mentioned in slides)
CREATE TABLE IF NOT EXISTS public.fanflet_sponsors (
  fanflet_id UUID NOT NULL REFERENCES public.fanflets(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (fanflet_id, sponsor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fanflet_sponsors_fanflet ON public.fanflet_sponsors(fanflet_id);
CREATE INDEX IF NOT EXISTS idx_fanflet_sponsors_sponsor ON public.fanflet_sponsors(sponsor_id);

-- RLS
ALTER TABLE public.fanflet_sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Speakers can manage sponsors for their own fanflets" ON public.fanflet_sponsors;
CREATE POLICY "Speakers can manage sponsors for their own fanflets"
  ON public.fanflet_sponsors FOR ALL TO authenticated
  USING (
    fanflet_id IN (
      SELECT f.id FROM public.fanflets f
      JOIN public.speakers s ON f.speaker_id = s.id
      WHERE s.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    fanflet_id IN (
      SELECT f.id FROM public.fanflets f
      JOIN public.speakers s ON f.speaker_id = s.id
      WHERE s.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sponsors can read their own fanflet associations" ON public.fanflet_sponsors;
CREATE POLICY "Sponsors can read their own fanflet associations"
  ON public.fanflet_sponsors FOR SELECT TO authenticated
  USING (
    sponsor_id IN (
      SELECT id FROM public.sponsor_accounts
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can read fanflet sponsor associations" ON public.fanflet_sponsors;
CREATE POLICY "Public can read fanflet sponsor associations"
  ON public.fanflet_sponsors FOR SELECT TO anon
  USING (
    fanflet_id IN (SELECT id FROM public.fanflets WHERE status = 'published')
  );
