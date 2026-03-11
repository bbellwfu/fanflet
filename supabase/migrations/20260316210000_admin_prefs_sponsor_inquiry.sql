-- Add sponsor_inquiry toggle to admin notification preferences.

ALTER TABLE public.admin_notification_preferences
  ADD COLUMN IF NOT EXISTS sponsor_inquiry BOOLEAN NOT NULL DEFAULT true;
