-- Content Resource Library & Secure Delivery
-- Adds file metadata columns, private storage bucket, storage quotas,
-- download analytics event type, and helper functions.
-- Idempotent: safe to run multiple times.

-- =============================================================================
-- 1. ADD COLUMNS TO resource_library
-- =============================================================================
ALTER TABLE public.resource_library
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

ALTER TABLE public.resource_library
  ADD COLUMN IF NOT EXISTS file_type TEXT;

ALTER TABLE public.resource_library
  ADD COLUMN IF NOT EXISTS media_metadata JSONB;

-- =============================================================================
-- 2. UPDATE analytics_events CHECK CONSTRAINT
-- =============================================================================
-- Drop old constraint and re-create with expanded set (superset of original).
ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'page_view', 'resource_click', 'email_signup',
    'qr_scan', 'referral_click', 'resource_download'
  ));

-- =============================================================================
-- 3. ADD STORAGE QUOTA LIMITS TO PLANS
-- =============================================================================
-- Merge new keys into existing limits JSONB without overwriting current values.
-- Uses || which merges top-level keys; existing keys like max_fanflets are preserved.
UPDATE public.plans
SET limits = limits || '{"storage_mb": 100, "max_file_mb": 10, "signed_url_minutes": 15}'::jsonb
WHERE name = 'free'
  AND NOT (limits ? 'storage_mb');

UPDATE public.plans
SET limits = limits || '{"storage_mb": 1024, "max_file_mb": 50, "signed_url_minutes": 60}'::jsonb
WHERE name = 'early_access'
  AND NOT (limits ? 'storage_mb');

UPDATE public.plans
SET limits = limits || '{"storage_mb": 5120, "max_file_mb": 100, "signed_url_minutes": 60}'::jsonb
WHERE name = 'pro'
  AND NOT (limits ? 'storage_mb');

UPDATE public.plans
SET limits = limits || '{"storage_mb": 51200, "max_file_mb": 500, "signed_url_minutes": 120}'::jsonb
WHERE name = 'enterprise'
  AND NOT (limits ? 'storage_mb');

-- =============================================================================
-- 4. CREATE PRIVATE file-uploads BUCKET
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'file-uploads',
  'file-uploads',
  false,
  524288000, -- 500 MB hard cap at bucket level (enterprise max)
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

-- =============================================================================
-- 5. RLS POLICIES FOR file-uploads BUCKET
-- =============================================================================

-- Speakers can upload files under their own speaker_id prefix
DROP POLICY IF EXISTS "Speakers can upload own files" ON storage.objects;
CREATE POLICY "Speakers can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.speakers WHERE auth_user_id = auth.uid()
    )
  );

-- Speakers can read their own files (for dashboard previews)
DROP POLICY IF EXISTS "Speakers can read own files" ON storage.objects;
CREATE POLICY "Speakers can read own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.speakers WHERE auth_user_id = auth.uid()
    )
  );

-- Speakers can update their own files (for replacements)
DROP POLICY IF EXISTS "Speakers can update own files" ON storage.objects;
CREATE POLICY "Speakers can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.speakers WHERE auth_user_id = auth.uid()
    )
  );

-- Speakers can delete their own files
DROP POLICY IF EXISTS "Speakers can delete own files" ON storage.objects;
CREATE POLICY "Speakers can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'file-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.speakers WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. HELPER: Compute total storage usage for a speaker
-- =============================================================================
CREATE OR REPLACE FUNCTION public.speaker_storage_used_bytes(p_speaker_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(file_size_bytes), 0)
  FROM public.resource_library
  WHERE speaker_id = p_speaker_id
    AND file_size_bytes IS NOT NULL;
$$;

-- =============================================================================
-- 7. ADD file_upload FEATURE FLAG
-- =============================================================================
INSERT INTO public.feature_flags (key, display_name, is_global)
VALUES ('file_upload', 'File upload and secure delivery', false)
ON CONFLICT (key) DO NOTHING;

-- Grant file_upload to all paid plans (early_access, pro, enterprise)
INSERT INTO public.plan_features (plan_id, feature_flag_id)
SELECT p.id, f.id FROM public.plans p, public.feature_flags f
WHERE p.name IN ('early_access', 'pro', 'enterprise')
  AND f.key = 'file_upload'
ON CONFLICT (plan_id, feature_flag_id) DO NOTHING;
