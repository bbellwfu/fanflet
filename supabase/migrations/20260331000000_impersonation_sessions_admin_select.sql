-- Allow platform admins and super admins to SELECT from impersonation_sessions
-- so the admin Impersonation Log page can use the authenticated admin's client
-- (avoids requiring service role for this read path and fixes RLS-related failures).

DROP POLICY IF EXISTS "Deny all access to impersonation_sessions" ON public.impersonation_sessions;

CREATE POLICY "Admins can select impersonation_sessions"
  ON public.impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.auth_user_id = auth.uid()
        AND ur.role IN ('super_admin', 'platform_admin')
        AND ur.removed_at IS NULL
    )
  );
