-- =============================================================================
-- Tighten INSERT RLS policies on public-facing tables
-- =============================================================================
-- Previously, subscribers, analytics_events, sms_bookmarks, and survey_responses
-- used WITH CHECK (true) for anonymous/authenticated INSERTs, allowing arbitrary
-- speaker_id / fanflet_id values. This migration restricts INSERTs to only
-- reference published fanflets (and valid speaker/fanflet pairs for subscribers).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SUBSCRIBERS — require valid speaker + published source_fanflet
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT TO anon
  WITH CHECK (
    speaker_id IN (SELECT id FROM public.speakers)
    AND (
      source_fanflet_id IS NULL
      OR source_fanflet_id IN (
        SELECT id FROM public.fanflets
        WHERE speaker_id = subscribers.speaker_id
          AND status = 'published'
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated can subscribe" ON public.subscribers;
CREATE POLICY "Authenticated can subscribe"
  ON public.subscribers FOR INSERT TO authenticated
  WITH CHECK (
    speaker_id IN (SELECT id FROM public.speakers)
    AND (
      source_fanflet_id IS NULL
      OR source_fanflet_id IN (
        SELECT id FROM public.fanflets
        WHERE speaker_id = subscribers.speaker_id
          AND status = 'published'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. ANALYTICS_EVENTS — require published fanflet
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events FOR INSERT TO anon
  WITH CHECK (
    fanflet_id IN (SELECT id FROM public.fanflets WHERE status = 'published')
  );

DROP POLICY IF EXISTS "Authenticated can insert analytics" ON public.analytics_events;
CREATE POLICY "Authenticated can insert analytics"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (
    fanflet_id IN (SELECT id FROM public.fanflets WHERE status = 'published')
  );

-- ---------------------------------------------------------------------------
-- 3. SMS_BOOKMARKS — require published fanflet
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can create sms bookmarks" ON public.sms_bookmarks;
CREATE POLICY "Anyone can create sms bookmarks"
  ON public.sms_bookmarks FOR INSERT TO anon
  WITH CHECK (
    fanflet_id IN (SELECT id FROM public.fanflets WHERE status = 'published')
  );

DROP POLICY IF EXISTS "Authenticated can create sms bookmarks" ON public.sms_bookmarks;
CREATE POLICY "Authenticated can create sms bookmarks"
  ON public.sms_bookmarks FOR INSERT TO authenticated
  WITH CHECK (
    fanflet_id IN (SELECT id FROM public.fanflets WHERE status = 'published')
  );

-- ---------------------------------------------------------------------------
-- 4. SURVEY_RESPONSES — require published fanflet
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can submit survey responses" ON public.survey_responses;
CREATE POLICY "Anyone can submit survey responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (
    fanflet_id IN (SELECT id FROM public.fanflets WHERE status = 'published')
  );
