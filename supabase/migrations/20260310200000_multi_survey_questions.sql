-- =============================================================================
-- Multi-question surveys: up to 3 ordered survey questions per fanflet
-- =============================================================================
-- Adds a uuid[] column to store an ordered list of survey question IDs.
-- Migrates any existing single survey_question_id into the array.
-- Updates the public-read RLS policy on survey_questions to cover both columns.
-- =============================================================================

-- 1. Add the array column
ALTER TABLE public.fanflets
  ADD COLUMN IF NOT EXISTS survey_question_ids uuid[] DEFAULT '{}';

-- 2. Backfill from the legacy single-question column
UPDATE public.fanflets
  SET survey_question_ids = ARRAY[survey_question_id]
  WHERE survey_question_id IS NOT NULL
    AND (survey_question_ids IS NULL OR survey_question_ids = '{}');

-- 3. Update public-read RLS to cover both the new array and legacy column
DROP POLICY IF EXISTS "Public can read survey questions linked to published fanflets"
  ON public.survey_questions;
CREATE POLICY "Public can read survey questions linked to published fanflets"
  ON public.survey_questions FOR SELECT TO anon, authenticated
  USING (
    id IN (
      SELECT UNNEST(survey_question_ids) FROM public.fanflets
      WHERE status = 'published' AND survey_question_ids != '{}'
    )
    OR id IN (
      SELECT survey_question_id FROM public.fanflets
      WHERE status = 'published' AND survey_question_id IS NOT NULL
    )
  );
