-- Migration: SMS bookmark tracking table
-- Tracks when attendees request a text with the fanflet link

CREATE TABLE IF NOT EXISTS public.sms_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fanflet_id UUID REFERENCES public.fanflets(id) ON DELETE CASCADE NOT NULL,
  phone_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for rate-limiting lookups (phone_hash + fanflet combo)
CREATE INDEX IF NOT EXISTS idx_sms_bookmarks_phone_fanflet
  ON public.sms_bookmarks(phone_hash, fanflet_id);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_sms_bookmarks_fanflet
  ON public.sms_bookmarks(fanflet_id);

-- RLS: service role only for inserts (API route uses service role or anon)
ALTER TABLE public.sms_bookmarks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public API)
DROP POLICY IF EXISTS "Anyone can create sms bookmarks" ON public.sms_bookmarks;
CREATE POLICY "Anyone can create sms bookmarks"
  ON public.sms_bookmarks FOR INSERT TO anon
  WITH CHECK (true);

-- Allow authenticated inserts
DROP POLICY IF EXISTS "Authenticated can create sms bookmarks" ON public.sms_bookmarks;
CREATE POLICY "Authenticated can create sms bookmarks"
  ON public.sms_bookmarks FOR INSERT TO authenticated
  WITH CHECK (true);

-- Speakers can read bookmarks for their own fanflets (analytics)
DROP POLICY IF EXISTS "Speakers can read own fanflet sms bookmarks" ON public.sms_bookmarks;
CREATE POLICY "Speakers can read own fanflet sms bookmarks"
  ON public.sms_bookmarks FOR SELECT TO authenticated
  USING (fanflet_id IN (
    SELECT f.id FROM public.fanflets f
    JOIN public.speakers s ON f.speaker_id = s.id
    WHERE s.auth_user_id = (SELECT auth.uid())
  ));

-- Add sms_bookmark to the analytics_events event_type check if it's constrained
-- (The current schema uses a text column without a check constraint, so no alter needed)
