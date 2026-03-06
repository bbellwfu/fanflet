-- =============================================================================
-- Allow public/anonymous read of survey_questions linked to published fanflets
-- =============================================================================
-- Without this, anon visitors cannot load the survey question on the landing
-- page, so the survey modal never appears.
-- =============================================================================

DROP POLICY IF EXISTS "Public can read survey questions linked to published fanflets" ON public.survey_questions;
CREATE POLICY "Public can read survey questions linked to published fanflets"
  ON public.survey_questions FOR SELECT TO anon, authenticated
  USING (
    id IN (
      SELECT survey_question_id FROM public.fanflets
      WHERE status = 'published' AND survey_question_id IS NOT NULL
    )
  );
