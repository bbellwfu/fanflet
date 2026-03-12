-- Impersonation table RLS hardening
-- These tables already have RLS enabled but zero policies (implicit deny).
-- Adding explicit deny-all for authenticated/anon makes intent clear and
-- prevents accidental exposure if a permissive policy is ever added.
-- Only service_role (used by admin back-office) should access these tables.

-- impersonation_sessions
DROP POLICY IF EXISTS "Deny all access to impersonation_sessions" ON impersonation_sessions;
CREATE POLICY "Deny all access to impersonation_sessions"
  ON impersonation_sessions
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- impersonation_tokens
DROP POLICY IF EXISTS "Deny all access to impersonation_tokens" ON impersonation_tokens;
CREATE POLICY "Deny all access to impersonation_tokens"
  ON impersonation_tokens
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- impersonation_actions
DROP POLICY IF EXISTS "Deny all access to impersonation_actions" ON impersonation_actions;
CREATE POLICY "Deny all access to impersonation_actions"
  ON impersonation_actions
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
