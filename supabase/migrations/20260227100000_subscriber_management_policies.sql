-- Migration: Add DELETE policy on subscribers so speakers can manage their subscriber list
-- Also add UPDATE policy for future use (e.g., adding name or notes to a subscriber)

-- DELETE: Speakers can remove their own subscribers
DROP POLICY IF EXISTS "Speakers can delete own subscribers" ON public.subscribers;
CREATE POLICY "Speakers can delete own subscribers"
  ON public.subscribers FOR DELETE TO authenticated
  USING (speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ));

-- UPDATE: Speakers can update their own subscribers (e.g., add name/notes)
DROP POLICY IF EXISTS "Speakers can update own subscribers" ON public.subscribers;
CREATE POLICY "Speakers can update own subscribers"
  ON public.subscribers FOR UPDATE TO authenticated
  USING (speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ));
