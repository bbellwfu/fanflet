-- Align sponsor_inquiries RLS with other admin tables: allow access via user_roles or app_metadata.
-- Previously only raw_app_meta_data->>'platform_admin' was checked, so admins granted via user_roles
-- could not update status/notes.

DROP POLICY IF EXISTS "Platform admins can read sponsor_inquiries" ON public.sponsor_inquiries;
CREATE POLICY "Platform admins can read sponsor_inquiries"
  ON public.sponsor_inquiries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'platform_admin')
        AND removed_at IS NULL
    )
    OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Platform admins can update sponsor_inquiries" ON public.sponsor_inquiries;
CREATE POLICY "Platform admins can update sponsor_inquiries"
  ON public.sponsor_inquiries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'platform_admin')
        AND removed_at IS NULL
    )
    OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'platform_admin')
        AND removed_at IS NULL
    )
    OR (SELECT auth.jwt()->'app_metadata'->>'role') IN ('platform_admin', 'super_admin')
  );
