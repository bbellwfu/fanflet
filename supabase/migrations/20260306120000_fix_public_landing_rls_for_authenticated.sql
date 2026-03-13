-- =============================================================================
-- Fix RLS: allow authenticated users to read published fanflets, blocks, and
-- library items — not just their own.  Without this, any logged-in user who
-- visits another speaker's public fanflet page gets a 404.
-- =============================================================================

-- 1. fanflets: authenticated can read any published fanflet
DROP POLICY IF EXISTS "Authenticated can read published fanflets" ON public.fanflets;
CREATE POLICY "Authenticated can read published fanflets"
  ON public.fanflets FOR SELECT TO authenticated
  USING (status = 'published');

-- 2. resource_blocks: authenticated can read blocks of any published fanflet
DROP POLICY IF EXISTS "Authenticated can read resource blocks of published fanflets" ON public.resource_blocks;
CREATE POLICY "Authenticated can read resource blocks of published fanflets"
  ON public.resource_blocks FOR SELECT TO authenticated
  USING (
    fanflet_id IN (
      SELECT id FROM public.fanflets WHERE status = 'published'
    )
  );

-- 3. resource_library: allow anon to read items on published fanflets,
--    and authenticated speakers to read items linked to their own fanflets
--    (important for previews of draft fanflets)
DROP POLICY IF EXISTS "Public can read library items linked to published fanflets" ON public.resource_library;
CREATE POLICY "Public can read library items linked to published fanflets"
  ON public.resource_library FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.resource_blocks rb
      JOIN public.fanflets f ON f.id = rb.fanflet_id
      JOIN public.speakers s ON s.id = f.speaker_id
      WHERE rb.library_item_id = public.resource_library.id
        AND (
          f.status = 'published'
          OR (auth.role() = 'authenticated' AND s.auth_user_id = auth.uid())
        )
    )
  );
