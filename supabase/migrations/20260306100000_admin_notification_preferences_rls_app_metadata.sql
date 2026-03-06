-- =============================================================================
-- Allow platform_admin via app_metadata (e.g. OAuth) to manage notification prefs
-- =============================================================================
-- Layout allows admins via user_roles OR app_metadata.role; RLS previously only
-- checked user_roles, so app_metadata-only admins got "Failed to update preferences".
-- =============================================================================

DROP POLICY IF EXISTS "Admins can manage own notification preferences" ON public.admin_notification_preferences;
CREATE POLICY "Admins can manage own notification preferences"
  ON public.admin_notification_preferences
  FOR ALL TO authenticated
  USING (
    admin_user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE auth_user_id = auth.uid() AND role = 'platform_admin')
      OR (auth.jwt()->'app_metadata'->>'role') = 'platform_admin'
    )
  )
  WITH CHECK (
    admin_user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.user_roles WHERE auth_user_id = auth.uid() AND role = 'platform_admin')
      OR (auth.jwt()->'app_metadata'->>'role') = 'platform_admin'
    )
  );
