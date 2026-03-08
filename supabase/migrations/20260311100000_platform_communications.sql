-- Platform communications system: announcements from admin to speakers/sponsors
-- with opt-in preferences, unsubscribe support, and delivery audit log.

-- 1. Communications (parent record per announcement)
CREATE TABLE IF NOT EXISTS public.platform_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by_admin_id UUID NOT NULL REFERENCES auth.users(id),
  source_type TEXT NOT NULL DEFAULT 'worklog_paste',
  source_reference TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ
);

ALTER TABLE public.platform_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admin_select_communications" ON public.platform_communications;
CREATE POLICY "platform_admin_select_communications" ON public.platform_communications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "platform_admin_insert_communications" ON public.platform_communications;
CREATE POLICY "platform_admin_insert_communications" ON public.platform_communications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "platform_admin_update_communications" ON public.platform_communications;
CREATE POLICY "platform_admin_update_communications" ON public.platform_communications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "service_role_all_communications" ON public.platform_communications;
CREATE POLICY "service_role_all_communications" ON public.platform_communications
  FOR ALL USING (true) WITH CHECK (true);


-- 2. Communication variants (per-audience content)
CREATE TABLE IF NOT EXISTS public.platform_communication_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES public.platform_communications(id) ON DELETE CASCADE,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('speaker', 'sponsor', 'audience')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT,
  UNIQUE (communication_id, audience_type)
);

ALTER TABLE public.platform_communication_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_admin_select_variants" ON public.platform_communication_variants;
CREATE POLICY "platform_admin_select_variants" ON public.platform_communication_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "platform_admin_insert_variants" ON public.platform_communication_variants;
CREATE POLICY "platform_admin_insert_variants" ON public.platform_communication_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "platform_admin_update_variants" ON public.platform_communication_variants;
CREATE POLICY "platform_admin_update_variants" ON public.platform_communication_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "service_role_all_variants" ON public.platform_communication_variants;
CREATE POLICY "service_role_all_variants" ON public.platform_communication_variants
  FOR ALL USING (true) WITH CHECK (true);


-- 3. Communication deliveries (audit trail)
CREATE TABLE IF NOT EXISTS public.communication_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id UUID NOT NULL REFERENCES public.platform_communications(id) ON DELETE CASCADE,
  audience_type TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id UUID,
  email_hash TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  provider_message_id TEXT,
  email_provider TEXT
);

ALTER TABLE public.communication_deliveries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_communication_deliveries_comm_id
  ON public.communication_deliveries(communication_id);
CREATE INDEX IF NOT EXISTS idx_communication_deliveries_comm_audience
  ON public.communication_deliveries(communication_id, audience_type);
CREATE INDEX IF NOT EXISTS idx_communication_deliveries_sent_at
  ON public.communication_deliveries(sent_at);
CREATE INDEX IF NOT EXISTS idx_communication_deliveries_idempotency
  ON public.communication_deliveries(communication_id, recipient_id, channel);

DROP POLICY IF EXISTS "platform_admin_select_deliveries" ON public.communication_deliveries;
CREATE POLICY "platform_admin_select_deliveries" ON public.communication_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "service_role_all_deliveries" ON public.communication_deliveries;
CREATE POLICY "service_role_all_deliveries" ON public.communication_deliveries
  FOR ALL USING (true) WITH CHECK (true);


-- 4. Communication preferences (opt-in per user per category)
CREATE TABLE IF NOT EXISTS public.platform_communication_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('speaker', 'sponsor', 'marketing')),
  speaker_id UUID REFERENCES public.speakers(id) ON DELETE CASCADE,
  sponsor_account_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE,
  email_hash TEXT,
  category TEXT NOT NULL DEFAULT 'platform_announcements',
  opted_in BOOLEAN NOT NULL DEFAULT false,
  opted_in_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (speaker_id, category),
  UNIQUE (sponsor_account_id, category),
  CHECK (
    (recipient_type = 'speaker' AND speaker_id IS NOT NULL) OR
    (recipient_type = 'sponsor' AND sponsor_account_id IS NOT NULL) OR
    (recipient_type = 'marketing' AND email_hash IS NOT NULL)
  )
);

ALTER TABLE public.platform_communication_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "speakers_manage_own_comm_prefs" ON public.platform_communication_preferences;
CREATE POLICY "speakers_manage_own_comm_prefs" ON public.platform_communication_preferences
  FOR ALL USING (
    speaker_id IN (
      SELECT id FROM public.speakers WHERE auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    speaker_id IN (
      SELECT id FROM public.speakers WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sponsors_manage_own_comm_prefs" ON public.platform_communication_preferences;
CREATE POLICY "sponsors_manage_own_comm_prefs" ON public.platform_communication_preferences
  FOR ALL USING (
    sponsor_account_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
    )
  ) WITH CHECK (
    sponsor_account_id IN (
      SELECT id FROM public.sponsor_accounts WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "platform_admin_all_comm_prefs" ON public.platform_communication_preferences;
CREATE POLICY "platform_admin_all_comm_prefs" ON public.platform_communication_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );

DROP POLICY IF EXISTS "service_role_all_comm_prefs" ON public.platform_communication_preferences;
CREATE POLICY "service_role_all_comm_prefs" ON public.platform_communication_preferences
  FOR ALL USING (true) WITH CHECK (true);


-- 5. Communication unsubscribes (global opt-out by email hash)
CREATE TABLE IF NOT EXISTS public.platform_communication_unsubscribes (
  email_hash TEXT PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  category TEXT
);

ALTER TABLE public.platform_communication_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_unsubs" ON public.platform_communication_unsubscribes;
CREATE POLICY "service_role_all_unsubs" ON public.platform_communication_unsubscribes
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "platform_admin_select_unsubs" ON public.platform_communication_unsubscribes;
CREATE POLICY "platform_admin_select_unsubs" ON public.platform_communication_unsubscribes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE auth_user_id = auth.uid() AND role = 'platform_admin'
    )
  );


-- 6. Auto-opt-in all existing speakers to platform_announcements
INSERT INTO public.platform_communication_preferences (
  recipient_type, speaker_id, category, opted_in, opted_in_at
)
SELECT 'speaker', id, 'platform_announcements', true, now()
FROM public.speakers
ON CONFLICT (speaker_id, category) DO NOTHING;
