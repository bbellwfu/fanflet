-- Impersonation tables for admin support sessions
-- Phase 1: sessions + handoff tokens
-- Phase 2: per-action audit log

-- ============================================================
-- impersonation_sessions: permanent audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_role TEXT NOT NULL CHECK (target_role IN ('speaker', 'sponsor')),
  reason TEXT,
  write_enabled BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  saved_auth_cookies JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT impersonation_different_users CHECK (admin_id != target_user_id)
);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin
  ON public.impersonation_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_target
  ON public.impersonation_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_active
  ON public.impersonation_sessions(admin_id, expires_at)
  WHERE ended_at IS NULL;

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Service role only — no authenticated-user policies
-- (regular users cannot see impersonation sessions)


-- ============================================================
-- impersonation_tokens: ephemeral one-time cross-domain handoff
-- ============================================================
CREATE TABLE IF NOT EXISTS public.impersonation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES public.impersonation_sessions(id) ON DELETE CASCADE,
  used BOOLEAN DEFAULT false NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_hash
  ON public.impersonation_tokens(token_hash)
  WHERE used = false;

ALTER TABLE public.impersonation_tokens ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- impersonation_actions: per-action audit log (Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.impersonation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.impersonation_sessions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_path TEXT,
  action_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_impersonation_actions_session
  ON public.impersonation_actions(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_actions_created
  ON public.impersonation_actions(created_at DESC);

ALTER TABLE public.impersonation_actions ENABLE ROW LEVEL SECURITY;
