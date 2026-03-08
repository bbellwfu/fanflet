-- Add show_event_name toggle to fanflets (defaults to true for backwards compatibility)
ALTER TABLE public.fanflets
  ADD COLUMN IF NOT EXISTS show_event_name BOOLEAN NOT NULL DEFAULT true;
