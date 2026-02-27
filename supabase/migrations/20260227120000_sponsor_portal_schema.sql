-- Migration: Sponsor Portal data model
-- Creates the foundation tables for sponsor accounts, connections, and shared resources.
-- No UI changes — this lays the groundwork for future portal development.

-- ============================================================================
-- 1. SPONSOR ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT NOT NULL,
  industry TEXT,
  social_links JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_slug
  ON public.sponsor_accounts(slug);

CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_industry
  ON public.sponsor_accounts(industry);

ALTER TABLE public.sponsor_accounts ENABLE ROW LEVEL SECURITY;

-- Sponsors can manage their own account
DROP POLICY IF EXISTS "Sponsors can manage own account" ON public.sponsor_accounts;
CREATE POLICY "Sponsors can manage own account"
  ON public.sponsor_accounts FOR ALL TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- Anyone can read verified sponsors (discovery)
DROP POLICY IF EXISTS "Public can read verified sponsors" ON public.sponsor_accounts;
CREATE POLICY "Public can read verified sponsors"
  ON public.sponsor_accounts FOR SELECT TO anon
  USING (is_verified = true);

-- Authenticated users can read verified sponsors (speaker discovery)
DROP POLICY IF EXISTS "Authenticated can read verified sponsors" ON public.sponsor_accounts;
CREATE POLICY "Authenticated can read verified sponsors"
  ON public.sponsor_accounts FOR SELECT TO authenticated
  USING (is_verified = true OR auth_user_id = (SELECT auth.uid()));

-- ============================================================================
-- 2. SPONSOR CONNECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE NOT NULL,
  speaker_id UUID REFERENCES public.speakers(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'declined', 'revoked')),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('sponsor', 'speaker')),
  message TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(sponsor_id, speaker_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_connections_sponsor
  ON public.sponsor_connections(sponsor_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_connections_speaker
  ON public.sponsor_connections(speaker_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_connections_status
  ON public.sponsor_connections(status);

ALTER TABLE public.sponsor_connections ENABLE ROW LEVEL SECURITY;

-- Sponsors can read/manage their own connections
DROP POLICY IF EXISTS "Sponsors can manage own connections" ON public.sponsor_connections;
CREATE POLICY "Sponsors can manage own connections"
  ON public.sponsor_connections FOR ALL TO authenticated
  USING (sponsor_id IN (
    SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (sponsor_id IN (
    SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
  ));

-- Speakers can read/manage connections where they are the speaker
DROP POLICY IF EXISTS "Speakers can manage own connections" ON public.sponsor_connections;
CREATE POLICY "Speakers can manage own connections"
  ON public.sponsor_connections FOR ALL TO authenticated
  USING (speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (speaker_id IN (
    SELECT id FROM public.speakers WHERE auth_user_id = (SELECT auth.uid())
  ));

-- ============================================================================
-- 3. SPONSOR RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('link', 'file', 'text', 'promo')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  file_path TEXT,
  image_url TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'retired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsor_resources_sponsor
  ON public.sponsor_resources(sponsor_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_resources_status
  ON public.sponsor_resources(status);

ALTER TABLE public.sponsor_resources ENABLE ROW LEVEL SECURITY;

-- Sponsors can manage their own resources
DROP POLICY IF EXISTS "Sponsors can manage own resources" ON public.sponsor_resources;
CREATE POLICY "Sponsors can manage own resources"
  ON public.sponsor_resources FOR ALL TO authenticated
  USING (sponsor_id IN (
    SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (sponsor_id IN (
    SELECT id FROM public.sponsor_accounts WHERE auth_user_id = (SELECT auth.uid())
  ));

-- Speakers with active connection can read sponsor resources
DROP POLICY IF EXISTS "Connected speakers can read sponsor resources" ON public.sponsor_resources;
CREATE POLICY "Connected speakers can read sponsor resources"
  ON public.sponsor_resources FOR SELECT TO authenticated
  USING (sponsor_id IN (
    SELECT sc.sponsor_id FROM public.sponsor_connections sc
    JOIN public.speakers s ON sc.speaker_id = s.id
    WHERE s.auth_user_id = (SELECT auth.uid())
    AND sc.status = 'active'
  ));

-- Public can read active sponsor resources linked to published fanflets
DROP POLICY IF EXISTS "Public can read published sponsor resources" ON public.sponsor_resources;
CREATE POLICY "Public can read published sponsor resources"
  ON public.sponsor_resources FOR SELECT TO anon
  USING (id IN (
    SELECT rb.sponsor_resource_id FROM public.resource_blocks rb
    JOIN public.fanflets f ON rb.fanflet_id = f.id
    WHERE f.status = 'published'
    AND rb.sponsor_resource_id IS NOT NULL
  ));

-- ============================================================================
-- 4. ADD SPONSOR RESOURCE FK TO RESOURCE_BLOCKS
-- ============================================================================

ALTER TABLE public.resource_blocks
  ADD COLUMN IF NOT EXISTS sponsor_resource_id UUID
    REFERENCES public.sponsor_resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resource_blocks_sponsor_resource
  ON public.resource_blocks(sponsor_resource_id)
  WHERE sponsor_resource_id IS NOT NULL;
