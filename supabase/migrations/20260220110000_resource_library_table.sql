-- Create resource_library table (base schema).
-- content_library_secure_delivery adds file_size_bytes, file_type, media_metadata.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.resource_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  speaker_id UUID NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  image_url TEXT,
  metadata JSONB,
  section_name TEXT,
  url TEXT
);

CREATE INDEX IF NOT EXISTS idx_resource_library_speaker ON public.resource_library(speaker_id);

ALTER TABLE public.resource_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Speakers can manage own resource_library" ON public.resource_library;
CREATE POLICY "Speakers can manage own resource_library"
  ON public.resource_library FOR ALL TO authenticated
  USING (speaker_id IN (SELECT id FROM public.speakers WHERE auth_user_id = auth.uid()))
  WITH CHECK (speaker_id IN (SELECT id FROM public.speakers WHERE auth_user_id = auth.uid()));
