-- Allow self-impersonation: admins who share the same auth account as a
-- sponsor or speaker can start an impersonation session to view that role
-- (e.g. demo platform, support testing). Sessions remain fully audited.

ALTER TABLE public.impersonation_sessions
  DROP CONSTRAINT IF EXISTS impersonation_different_users;
