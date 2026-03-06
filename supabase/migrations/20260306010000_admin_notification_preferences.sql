-- =============================================================================
-- Admin notification preferences: per-admin toggles for platform event emails
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  speaker_signup BOOLEAN NOT NULL DEFAULT true,
  sponsor_signup BOOLEAN NOT NULL DEFAULT true,
  fanflet_created BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_notification_preferences_admin_user_id
  ON public.admin_notification_preferences(admin_user_id);

ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Platform admins can read and update their own row; can insert their own row (first-time)
DROP POLICY IF EXISTS "Admins can manage own notification preferences" ON public.admin_notification_preferences;
CREATE POLICY "Admins can manage own notification preferences"
  ON public.admin_notification_preferences
  FOR ALL TO authenticated
  USING (
    admin_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE auth_user_id = auth.uid() AND role = 'platform_admin')
  )
  WITH CHECK (
    admin_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE auth_user_id = auth.uid() AND role = 'platform_admin')
  );

-- Service role needs full access for notifyAdmins() lookups (service_role bypasses RLS by default)
-- No additional policy needed.

-- =============================================================================
-- Seed preferences for existing platform admins (idempotent)
-- =============================================================================
INSERT INTO public.admin_notification_preferences (
  admin_user_id,
  speaker_signup,
  sponsor_signup,
  fanflet_created,
  onboarding_completed,
  created_at,
  updated_at
)
SELECT
  ur.auth_user_id,
  true,
  true,
  true,
  true,
  now(),
  now()
FROM public.user_roles ur
WHERE ur.role = 'platform_admin'
ON CONFLICT (admin_user_id) DO NOTHING;
