-- Worklog archives: admin can mark worklogs as archived so they are excluded from
-- the communications pending banner and worklog picker. Unarchive restores them.
-- Underlying worklog files are never deleted.

CREATE TABLE IF NOT EXISTS public.worklog_archives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worklog_filename TEXT NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  archived_by_admin_id UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE (worklog_filename)
);

CREATE INDEX IF NOT EXISTS idx_worklog_archives_filename
  ON public.worklog_archives(worklog_filename);
CREATE INDEX IF NOT EXISTS idx_worklog_archives_archived_at
  ON public.worklog_archives(archived_at);

ALTER TABLE public.worklog_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admin_select_worklog_archives" ON public.worklog_archives;
CREATE POLICY "platform_admin_select_worklog_archives" ON public.worklog_archives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'platform_admin') AND removed_at IS NULL
    )
    OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "platform_admin_insert_worklog_archives" ON public.worklog_archives;
CREATE POLICY "platform_admin_insert_worklog_archives" ON public.worklog_archives
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'platform_admin') AND removed_at IS NULL
    )
    OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "platform_admin_delete_worklog_archives" ON public.worklog_archives;
CREATE POLICY "platform_admin_delete_worklog_archives" ON public.worklog_archives
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'platform_admin') AND removed_at IS NULL
    )
    OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "service_role_all_worklog_archives" ON public.worklog_archives;
CREATE POLICY "service_role_all_worklog_archives" ON public.worklog_archives
  FOR ALL USING (true) WITH CHECK (true);
