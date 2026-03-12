-- Add all_speakers_assigned to sponsor_campaigns

ALTER TABLE public.sponsor_campaigns 
ADD COLUMN IF NOT EXISTS all_speakers_assigned BOOLEAN NOT NULL DEFAULT false;

-- Add index since we'll query it for speaker campaigns
CREATE INDEX IF NOT EXISTS idx_sponsor_campaigns_all_speakers 
  ON public.sponsor_campaigns(all_speakers_assigned);
