-- =============================================================================
-- Compliance management: DSR tracking, soft-delete columns, FK fixes
-- =============================================================================
-- Phase 1 of the compliance management system. Adds:
--   1. Soft-delete columns on speakers and sponsor_accounts
--   2. FK fixes on audit tables that block auth.users deletion
--   3. data_subject_requests table for DSR tracking
--   4. data_subject_request_steps table for pipeline step tracking
--   5. Expanded admin_audit_log category constraint
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Expand speakers status CHECK to include pending_delete
-- ---------------------------------------------------------------------------

ALTER TABLE public.speakers DROP CONSTRAINT IF EXISTS speakers_status_check;
ALTER TABLE public.speakers ADD CONSTRAINT speakers_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'deactivated'::text, 'pending_delete'::text]));

-- ---------------------------------------------------------------------------
-- 1. Soft-delete columns on speakers
-- ---------------------------------------------------------------------------

ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_speakers_deleted
  ON public.speakers(deleted_at) WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Soft-delete columns on sponsor_accounts
-- ---------------------------------------------------------------------------

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_deleted
  ON public.sponsor_accounts(deleted_at) WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Fix FK blockers on audit/history tables
--    These tables reference auth.users with implicit RESTRICT, which blocks
--    auth.admin.deleteUser(). Change to SET NULL to preserve audit history.
-- ---------------------------------------------------------------------------

-- 3a. impersonation_sessions.admin_id
ALTER TABLE public.impersonation_sessions
  ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.impersonation_sessions
  DROP CONSTRAINT IF EXISTS impersonation_sessions_admin_id_fkey;
ALTER TABLE public.impersonation_sessions
  ADD CONSTRAINT impersonation_sessions_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3b. impersonation_sessions.target_user_id
ALTER TABLE public.impersonation_sessions
  ALTER COLUMN target_user_id DROP NOT NULL;
ALTER TABLE public.impersonation_sessions
  DROP CONSTRAINT IF EXISTS impersonation_sessions_target_user_id_fkey;
ALTER TABLE public.impersonation_sessions
  ADD CONSTRAINT impersonation_sessions_target_user_id_fkey
    FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3c. admin_audit_log.admin_id
ALTER TABLE public.admin_audit_log
  ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3d. platform_communications.created_by_admin_id
ALTER TABLE public.platform_communications
  ALTER COLUMN created_by_admin_id DROP NOT NULL;
ALTER TABLE public.platform_communications
  DROP CONSTRAINT IF EXISTS platform_communications_created_by_admin_id_fkey;
ALTER TABLE public.platform_communications
  ADD CONSTRAINT platform_communications_created_by_admin_id_fkey
    FOREIGN KEY (created_by_admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3e. admin_invitations.invited_by
ALTER TABLE public.admin_invitations
  ALTER COLUMN invited_by DROP NOT NULL;
ALTER TABLE public.admin_invitations
  DROP CONSTRAINT IF EXISTS admin_invitations_invited_by_fkey;
ALTER TABLE public.admin_invitations
  ADD CONSTRAINT admin_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 4. Expand admin_audit_log category CHECK to include 'compliance'
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_category_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_category_check
    CHECK (category IN (
      'account', 'plan', 'feature', 'sponsor',
      'communication', 'admin_management', 'setting',
      'impersonation', 'system', 'compliance'
    ));

-- ---------------------------------------------------------------------------
-- 5. data_subject_requests — tracks deletion/export/access requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Subject identity
  subject_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_email TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('speaker', 'sponsor', 'audience')),
  subject_name TEXT,

  -- Request classification
  request_type TEXT NOT NULL CHECK (request_type IN (
    'erasure',
    'export',
    'access',
    'rectification',
    'restriction',
    'objection'
  )),

  -- Source and context
  source TEXT NOT NULL CHECK (source IN (
    'user_self_service',
    'admin_initiated',
    'email_request',
    'legal_request'
  )),
  source_reference TEXT,

  -- Regulatory context
  regulation TEXT CHECK (regulation IN ('gdpr', 'ccpa', 'pipeda', 'lgpd', 'other') OR regulation IS NULL),
  regulatory_deadline TIMESTAMPTZ,

  -- Pipeline state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'processing',
    'on_hold',
    'completed',
    'cancelled',
    'rejected'
  )),
  hold_reason TEXT,

  -- Pre-deletion snapshot
  data_snapshot_path TEXT,

  -- Processing metadata
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dsr_status
  ON public.data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_subject
  ON public.data_subject_requests(subject_auth_user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_deadline
  ON public.data_subject_requests(regulatory_deadline)
  WHERE status NOT IN ('completed', 'cancelled', 'rejected');
CREATE INDEX IF NOT EXISTS idx_dsr_created
  ON public.data_subject_requests(created_at DESC);

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on data_subject_requests" ON public.data_subject_requests;
CREATE POLICY "Service role full access on data_subject_requests"
  ON public.data_subject_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can read data subject requests" ON public.data_subject_requests;
CREATE POLICY "Super admins can read data subject requests"
  ON public.data_subject_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = (SELECT auth.uid())
        AND role = 'super_admin'
        AND removed_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 6. data_subject_request_steps — tracks each pipeline step
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.data_subject_request_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.data_subject_requests(id) ON DELETE CASCADE,

  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_category TEXT NOT NULL CHECK (step_category IN (
    'validation',
    'notification',
    'snapshot',
    'soft_delete',
    'data_deletion',
    'storage_cleanup',
    'auth_deletion',
    'verification'
  )),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed', 'skipped'
  )),
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dsr_steps_request
  ON public.data_subject_request_steps(request_id, step_order);

ALTER TABLE public.data_subject_request_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on dsr_steps" ON public.data_subject_request_steps;
CREATE POLICY "Service role full access on dsr_steps"
  ON public.data_subject_request_steps FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Super admins can read dsr steps" ON public.data_subject_request_steps;
CREATE POLICY "Super admins can read dsr steps"
  ON public.data_subject_request_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = (SELECT auth.uid())
        AND role = 'super_admin'
        AND removed_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Notification tracking columns on data_subject_requests
-- ---------------------------------------------------------------------------

ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS notification_email TEXT,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_method TEXT CHECK (
    notification_method IS NULL
    OR notification_method IN ('email', 'postal', 'in_app', 'other')
  );

-- ---------------------------------------------------------------------------
-- 9. Compliance exports storage bucket (private, service-role only)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('compliance-exports', 'compliance-exports', false, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role only - compliance exports" ON storage.objects;
CREATE POLICY "Service role only - compliance exports"
  ON storage.objects FOR ALL
  USING (bucket_id = 'compliance-exports' AND auth.role() = 'service_role');
