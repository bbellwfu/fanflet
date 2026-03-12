-- Add missing updated_at triggers
-- Reuses the existing handle_updated_at() function.
-- 8 tables already have triggers; this adds the remaining 15.

DO $$ BEGIN
  -- admin_notification_preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'admin_notification_preferences_updated_at') THEN
    CREATE TRIGGER admin_notification_preferences_updated_at
      BEFORE UPDATE ON admin_notification_preferences
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- audience_accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'audience_accounts_updated_at') THEN
    CREATE TRIGGER audience_accounts_updated_at
      BEFORE UPDATE ON audience_accounts
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- data_subject_requests
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'data_subject_requests_updated_at') THEN
    CREATE TRIGGER data_subject_requests_updated_at
      BEFORE UPDATE ON data_subject_requests
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- integration_connections
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'integration_connections_updated_at') THEN
    CREATE TRIGGER integration_connections_updated_at
      BEFORE UPDATE ON integration_connections
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- platform_communication_preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'platform_communication_preferences_updated_at') THEN
    CREATE TRIGGER platform_communication_preferences_updated_at
      BEFORE UPDATE ON platform_communication_preferences
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- platform_communications
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'platform_communications_updated_at') THEN
    CREATE TRIGGER platform_communications_updated_at
      BEFORE UPDATE ON platform_communications
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- resource_library
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'resource_library_updated_at') THEN
    CREATE TRIGGER resource_library_updated_at
      BEFORE UPDATE ON resource_library
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- sponsor_accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sponsor_accounts_updated_at') THEN
    CREATE TRIGGER sponsor_accounts_updated_at
      BEFORE UPDATE ON sponsor_accounts
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- sponsor_campaigns
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sponsor_campaigns_updated_at') THEN
    CREATE TRIGGER sponsor_campaigns_updated_at
      BEFORE UPDATE ON sponsor_campaigns
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- sponsor_connections
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sponsor_connections_updated_at') THEN
    CREATE TRIGGER sponsor_connections_updated_at
      BEFORE UPDATE ON sponsor_connections
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- sponsor_plans
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sponsor_plans_updated_at') THEN
    CREATE TRIGGER sponsor_plans_updated_at
      BEFORE UPDATE ON sponsor_plans
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- sponsor_resource_library
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sponsor_resource_library_updated_at') THEN
    CREATE TRIGGER sponsor_resource_library_updated_at
      BEFORE UPDATE ON sponsor_resource_library
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- sponsor_resources
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sponsor_resources_updated_at') THEN
    CREATE TRIGGER sponsor_resources_updated_at
      BEFORE UPDATE ON sponsor_resources
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- sponsor_subscriptions
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'sponsor_subscriptions_updated_at') THEN
    CREATE TRIGGER sponsor_subscriptions_updated_at
      BEFORE UPDATE ON sponsor_subscriptions
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- survey_questions
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'survey_questions_updated_at') THEN
    CREATE TRIGGER survey_questions_updated_at
      BEFORE UPDATE ON survey_questions
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;
