-- Sponsor Resource Library (Content Hub Phase 2)
-- New tables: sponsor_resource_library, sponsor_resource_events.
-- resource_blocks.sponsor_library_item_id, storage bucket sponsor-file-uploads.
-- Idempotent: safe to run multiple times.

-- =============================================================================
-- 1. SPONSOR_RESOURCE_LIBRARY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_resource_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('file', 'link', 'video', 'sponsor_block')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  file_path TEXT,
  file_size_bytes BIGINT,
  file_type TEXT,
  image_url TEXT,
  media_metadata JSONB,
  campaign_id UUID,
  availability TEXT NOT NULL DEFAULT 'draft' CHECK (availability IN ('all', 'specific', 'draft')),
  available_to UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'available', 'unpublished', 'removed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_resource_library_sponsor
  ON public.sponsor_resource_library(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_resource_library_status
  ON public.sponsor_resource_library(status)
  WHERE status != 'removed';
CREATE INDEX IF NOT EXISTS idx_sponsor_resource_library_campaign
  ON public.sponsor_resource_library(campaign_id)
  WHERE campaign_id IS NOT NULL;

ALTER TABLE public.sponsor_resource_library ENABLE ROW LEVEL SECURITY;

-- Add column before any policy references it
ALTER TABLE public.resource_blocks
  ADD COLUMN IF NOT EXISTS sponsor_library_item_id UUID
  REFERENCES public.sponsor_resource_library(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_resource_blocks_sponsor_library_item
  ON public.resource_blocks(sponsor_library_item_id)
  WHERE sponsor_library_item_id IS NOT NULL;

DROP POLICY IF EXISTS "Sponsors can manage own library" ON public.sponsor_resource_library;
CREATE POLICY "Sponsors can manage own library"
  ON public.sponsor_resource_library FOR ALL TO authenticated
  USING (
    sponsor_id IN (SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    sponsor_id IN (SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid()))
  );

-- Connected speakers can read available resources (catalog) when status = available and availability includes them
DROP POLICY IF EXISTS "Connected speakers can read sponsor library catalog" ON public.sponsor_resource_library;
CREATE POLICY "Connected speakers can read sponsor library catalog"
  ON public.sponsor_resource_library FOR SELECT TO authenticated
  USING (
    status = 'available'
    AND (
      availability = 'all'
      OR (
        availability = 'specific'
        AND (SELECT id FROM public.speakers WHERE auth_user_id = auth.uid()) = ANY(available_to)
      )
    )
    AND sponsor_id IN (
      SELECT sc.sponsor_id FROM public.sponsor_connections sc
      JOIN public.speakers s ON sc.speaker_id = s.id
      WHERE s.auth_user_id = auth.uid() AND sc.status = 'active'
    )
  );

-- Speakers can read library rows they have placed (for editor, tombstone warning)
DROP POLICY IF EXISTS "Speakers can read placed sponsor library items" ON public.sponsor_resource_library;
CREATE POLICY "Speakers can read placed sponsor library items"
  ON public.sponsor_resource_library FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT rb.sponsor_library_item_id FROM public.resource_blocks rb
      JOIN public.fanflets f ON rb.fanflet_id = f.id
      JOIN public.speakers s ON f.speaker_id = s.id
      WHERE s.auth_user_id = auth.uid() AND rb.sponsor_library_item_id IS NOT NULL
    )
  );

-- Public can read sponsor library rows linked to blocks on published fanflets (landing page + download)
DROP POLICY IF EXISTS "Public can read sponsor library on published fanflets" ON public.sponsor_resource_library;
CREATE POLICY "Public can read sponsor library on published fanflets"
  ON public.sponsor_resource_library FOR SELECT TO anon, authenticated
  USING (
    id IN (
      SELECT rb.sponsor_library_item_id FROM public.resource_blocks rb
      JOIN public.fanflets f ON f.id = rb.fanflet_id
      WHERE f.status = 'published' AND rb.sponsor_library_item_id IS NOT NULL
    )
  );

-- Service role for admin/backfills
DROP POLICY IF EXISTS "Service role can manage sponsor_resource_library" ON public.sponsor_resource_library;
CREATE POLICY "Service role can manage sponsor_resource_library"
  ON public.sponsor_resource_library FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 2. SPONSOR_RESOURCE_EVENTS (activity log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_resource_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_resource_id UUID NOT NULL REFERENCES public.sponsor_resource_library(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'published', 'unpublished', 'removed', 'file_replaced', 'availability_changed'
  )),
  actor_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_resource_events_resource
  ON public.sponsor_resource_events(sponsor_resource_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_resource_events_sponsor_created
  ON public.sponsor_resource_events(sponsor_id, created_at DESC);

ALTER TABLE public.sponsor_resource_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sponsors can read own resource events" ON public.sponsor_resource_events;
CREATE POLICY "Sponsors can read own resource events"
  ON public.sponsor_resource_events FOR SELECT TO authenticated
  USING (
    sponsor_id IN (SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid()))
  );

-- Speakers can read events for resources they have placed (via resource_blocks)
DROP POLICY IF EXISTS "Speakers can read events for placed sponsor resources" ON public.sponsor_resource_events;
CREATE POLICY "Speakers can read events for placed sponsor resources"
  ON public.sponsor_resource_events FOR SELECT TO authenticated
  USING (
    sponsor_resource_id IN (
      SELECT sponsor_library_item_id FROM public.resource_blocks rb
      JOIN public.fanflets f ON rb.fanflet_id = f.id
      JOIN public.speakers s ON f.speaker_id = s.id
      WHERE s.auth_user_id = (SELECT auth.uid()) AND rb.sponsor_library_item_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Service role can manage sponsor_resource_events" ON public.sponsor_resource_events;
CREATE POLICY "Service role can manage sponsor_resource_events"
  ON public.sponsor_resource_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- 3. STORAGE BUCKET: sponsor-file-uploads
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor-file-uploads',
  'sponsor-file-uploads',
  false,
  104857600,
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Sponsors can upload under their sponsor_id prefix
DROP POLICY IF EXISTS "Sponsors can upload own files" ON storage.objects;
CREATE POLICY "Sponsors can upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sponsor-file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sponsors can read own sponsor files" ON storage.objects;
CREATE POLICY "Sponsors can read own sponsor files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'sponsor-file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sponsors can update own sponsor files" ON storage.objects;
CREATE POLICY "Sponsors can update own sponsor files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'sponsor-file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sponsors can delete own sponsor files" ON storage.objects;
CREATE POLICY "Sponsors can delete own sponsor files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'sponsor-file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- 4. HELPER: Sponsor storage used (bytes)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sponsor_storage_used_bytes(p_sponsor_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(file_size_bytes), 0)
  FROM public.sponsor_resource_library
  WHERE sponsor_id = p_sponsor_id
    AND type = 'file'
    AND file_size_bytes IS NOT NULL;
$$;

-- =============================================================================
-- 5. FEATURE FLAG: sponsor_resource_library
-- =============================================================================

INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES ('sponsor_resource_library', 'Sponsor resource library and catalog', false)
ON CONFLICT (key) DO NOTHING;

-- Sponsor plan features: add to sponsor_plan_features (sponsor_plans)
-- Check if sponsor_plan_features exists and wire the flag
DO $$
DECLARE
  flag_id UUID;
  plan_id_rec RECORD;
BEGIN
  SELECT id INTO flag_id FROM public.feature_flags WHERE key = 'sponsor_resource_library' LIMIT 1;
  IF flag_id IS NOT NULL THEN
    FOR plan_id_rec IN SELECT id FROM public.sponsor_plans WHERE name IN ('sponsor_pro', 'sponsor_enterprise')
    LOOP
      INSERT INTO public.sponsor_plan_features (plan_id, feature_flag_id)
      VALUES (plan_id_rec.id, flag_id)
      ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;
