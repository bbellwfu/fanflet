-- =============================================================================
-- Fanflet Production Database Initialization
-- =============================================================================
-- Run this entire script in the Supabase SQL Editor for the PRODUCTION project.
-- It creates all tables, indexes, RLS policies, triggers, and storage buckets.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. CORE TABLES
-- =============================================================================

-- SPEAKERS
CREATE TABLE public.speakers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  bio text DEFAULT '',
  photo_url text,
  slug text UNIQUE,
  social_links jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX idx_speakers_auth_user ON public.speakers(auth_user_id);
CREATE UNIQUE INDEX idx_speakers_slug ON public.speakers(slug);

-- FANFLETS
CREATE TABLE public.fanflets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  event_name text NOT NULL DEFAULT '',
  event_date date,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  theme_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  published_at timestamptz,
  description text,
  UNIQUE(speaker_id, slug)
);

CREATE INDEX idx_fanflets_speaker ON public.fanflets(speaker_id);
CREATE INDEX idx_fanflets_status ON public.fanflets(status);

-- RESOURCE BLOCKS
CREATE TABLE public.resource_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fanflet_id uuid REFERENCES public.fanflets(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('link', 'file', 'embed', 'text', 'sponsor')),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  url text,
  file_path text,
  display_order integer NOT NULL DEFAULT 0,
  section_name text DEFAULT 'Resources',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  image_url text
);

CREATE INDEX idx_blocks_fanflet ON public.resource_blocks(fanflet_id);
CREATE INDEX idx_blocks_order ON public.resource_blocks(fanflet_id, display_order);

-- SUBSCRIBERS
CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  name text,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE CASCADE NOT NULL,
  source_fanflet_id uuid REFERENCES public.fanflets(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(email, speaker_id)
);

CREATE INDEX idx_subscribers_speaker ON public.subscribers(speaker_id);
CREATE INDEX idx_subscribers_fanflet ON public.subscribers(source_fanflet_id);

-- ANALYTICS EVENTS
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fanflet_id uuid REFERENCES public.fanflets(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'resource_click', 'email_signup', 'qr_scan')),
  resource_block_id uuid REFERENCES public.resource_blocks(id) ON DELETE SET NULL,
  visitor_hash text,
  device_type text,
  referrer text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_analytics_fanflet ON public.analytics_events(fanflet_id);
CREATE INDEX idx_analytics_type ON public.analytics_events(fanflet_id, event_type);
CREATE INDEX idx_analytics_time ON public.analytics_events(created_at);

-- SURVEY QUESTIONS (speaker's question library)
CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  speaker_id uuid NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('nps', 'yes_no', 'rating')),
  options jsonb DEFAULT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_questions_speaker ON survey_questions(speaker_id);

-- Add survey question FK to fanflets
ALTER TABLE fanflets ADD COLUMN survey_question_id uuid REFERENCES survey_questions(id) ON DELETE SET NULL;

-- SURVEY RESPONSES
CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  fanflet_id uuid NOT NULL REFERENCES fanflets(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  response_value text NOT NULL,
  visitor_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_responses_fanflet ON survey_responses(fanflet_id);
CREATE INDEX idx_survey_responses_question ON survey_responses(question_id);
CREATE INDEX idx_survey_responses_visitor ON survey_responses(fanflet_id, question_id, visitor_hash);

-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fanflets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- SPEAKERS
CREATE POLICY "Speakers can read own profile"
  ON public.speakers FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Speakers can update own profile"
  ON public.speakers FOR UPDATE TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Public can read speaker profiles"
  ON public.speakers FOR SELECT TO anon
  USING (true);

CREATE POLICY "System can insert speaker on signup"
  ON public.speakers FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- FANFLETS
CREATE POLICY "Speakers can manage own fanflets"
  ON public.fanflets FOR ALL TO authenticated
  USING (speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Public can read published fanflets"
  ON public.fanflets FOR SELECT TO anon
  USING (status = 'published');

-- RESOURCE BLOCKS
CREATE POLICY "Speakers can manage own resource blocks"
  ON public.resource_blocks FOR ALL TO authenticated
  USING (fanflet_id IN (
    SELECT f.id FROM public.fanflets f
    JOIN public.speakers s ON f.speaker_id = s.id
    WHERE s.auth_user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Public can read resource blocks of published fanflets"
  ON public.resource_blocks FOR SELECT TO anon
  USING (fanflet_id IN (
    SELECT id FROM public.fanflets WHERE status = 'published'
  ));

-- SUBSCRIBERS
CREATE POLICY "Speakers can read own subscribers"
  ON public.subscribers FOR SELECT TO authenticated
  USING (speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ));

CREATE POLICY "Anyone can subscribe"
  ON public.subscribers FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can subscribe"
  ON public.subscribers FOR INSERT TO authenticated
  WITH CHECK (true);

-- ANALYTICS EVENTS
CREATE POLICY "Anyone can insert analytics"
  ON public.analytics_events FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert analytics"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Speakers can read own analytics"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (fanflet_id IN (
    SELECT f.id FROM public.fanflets f
    JOIN public.speakers s ON f.speaker_id = s.id
    WHERE s.auth_user_id = (SELECT auth.uid())
  ));

-- SURVEY QUESTIONS
CREATE POLICY "Speakers can manage their own questions"
  ON survey_questions FOR ALL
  USING (speaker_id IN (SELECT id FROM speakers WHERE auth_user_id = auth.uid()))
  WITH CHECK (speaker_id IN (SELECT id FROM speakers WHERE auth_user_id = auth.uid()));

-- SURVEY RESPONSES
CREATE POLICY "Anyone can submit survey responses"
  ON survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Speakers can read their own survey responses"
  ON survey_responses FOR SELECT
  USING (
    fanflet_id IN (
      SELECT f.id FROM fanflets f
      JOIN speakers s ON f.speaker_id = s.id
      WHERE s.auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. TRIGGERS
-- =============================================================================

-- Auto-create speaker record when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.speakers (auth_user_id, email, name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER speakers_updated_at BEFORE UPDATE ON public.speakers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER fanflets_updated_at BEFORE UPDATE ON public.fanflets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER resource_blocks_updated_at BEFORE UPDATE ON public.resource_blocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. STORAGE BUCKETS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', true);

-- Storage policies
CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "Users can update own resources"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "Users can delete own resources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

CREATE POLICY "Resources are publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'resources');

-- =============================================================================
-- Done! Production database is fully initialized.
-- =============================================================================
