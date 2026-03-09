-- =============================================================================
-- Two-tier admin roles (super_admin / platform_admin) + admin audit log
-- =============================================================================
-- Enhances user_roles to support super_admin role with safety guardrails.
-- Creates admin_audit_log for compliance tracking of all admin actions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Expand user_roles CHECK constraint to allow super_admin
-- ---------------------------------------------------------------------------

-- Drop any existing check constraint on role (idempotent: handles any constraint name)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'user_roles' AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('super_admin', 'platform_admin'));

-- ---------------------------------------------------------------------------
-- 2. Migrate the first existing platform_admin to super_admin
-- ---------------------------------------------------------------------------

UPDATE public.user_roles
SET role = 'super_admin'
WHERE role = 'platform_admin'
  AND created_at = (
    SELECT MIN(created_at) FROM public.user_roles WHERE role = 'platform_admin'
  );

-- ---------------------------------------------------------------------------
-- 3. Add new columns to user_roles
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_roles_active_admins
  ON public.user_roles(role) WHERE removed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Trigger to prevent removing the last super_admin
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  remaining INT;
BEGIN
  -- On UPDATE: check if role is being changed away from super_admin or removed_at is being set
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.role = 'super_admin' AND NEW.role <> 'super_admin')
       OR (OLD.removed_at IS NULL AND NEW.removed_at IS NOT NULL AND OLD.role = 'super_admin') THEN
      SELECT COUNT(*) INTO remaining
      FROM public.user_roles
      WHERE role = 'super_admin' AND removed_at IS NULL AND id <> OLD.id
      FOR UPDATE;

      IF remaining < 1 THEN
        RAISE EXCEPTION 'Cannot remove or demote the last super admin';
      END IF;
    END IF;
  END IF;

  -- On DELETE: check if we're deleting a super_admin
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' AND OLD.removed_at IS NULL THEN
      SELECT COUNT(*) INTO remaining
      FROM public.user_roles
      WHERE role = 'super_admin' AND removed_at IS NULL AND id <> OLD.id
      FOR UPDATE;

      IF remaining < 1 THEN
        RAISE EXCEPTION 'Cannot delete the last super admin';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_super_admin ON public.user_roles;
CREATE TRIGGER trg_prevent_last_super_admin
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_super_admin_removal();

-- ---------------------------------------------------------------------------
-- 5. Update RLS to let admins see all active admin rows (for team page)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.auth_user_id = (SELECT auth.uid())
        AND ur.role IN ('super_admin', 'platform_admin')
        AND ur.removed_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Create admin_audit_log table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'account', 'plan', 'feature', 'sponsor',
    'communication', 'admin_management', 'setting',
    'impersonation', 'system'
  )),
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin
  ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
  ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_category
  ON public.admin_audit_log(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON public.admin_audit_log(target_type, target_id)
  WHERE target_id IS NOT NULL;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role manages audit logs"
  ON public.admin_audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = (SELECT auth.uid())
        AND role = 'super_admin'
        AND removed_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Update admin_notification_preferences RLS to recognise super_admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can manage own notification preferences via app_metadata" ON public.admin_notification_preferences;
CREATE POLICY "Admins can manage own notification preferences via app_metadata" ON public.admin_notification_preferences
  FOR ALL TO authenticated
  USING (
    admin_user_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE auth_user_id = (SELECT auth.uid())
          AND role IN ('super_admin', 'platform_admin')
          AND removed_at IS NULL
      )
      OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
    )
  )
  WITH CHECK (
    admin_user_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE auth_user_id = (SELECT auth.uid())
          AND role IN ('super_admin', 'platform_admin')
          AND removed_at IS NULL
      )
      OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
    )
  );
