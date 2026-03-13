-- 1. Drop old status constraint FIRST
ALTER TABLE sponsor_resource_library DROP CONSTRAINT IF EXISTS sponsor_resource_library_status_check;

-- 2. Update status values: available → published, unpublished → archived
UPDATE sponsor_resource_library SET status = 'published' WHERE status = 'available';
UPDATE sponsor_resource_library SET status = 'archived' WHERE status = 'unpublished';

-- 3. Add new status check constraint
ALTER TABLE sponsor_resource_library ADD CONSTRAINT sponsor_resource_library_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'removed'::text]));

-- 4. Create junction table for multi-campaign assignment
CREATE TABLE IF NOT EXISTS sponsor_resource_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES sponsor_resource_library(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES sponsor_campaigns(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, campaign_id)
);

-- 5. Migrate any existing campaign_id values to junction table
INSERT INTO sponsor_resource_campaigns (resource_id, campaign_id)
SELECT id, campaign_id FROM sponsor_resource_library
WHERE campaign_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. Drop the old campaign_id FK column
ALTER TABLE sponsor_resource_library DROP COLUMN IF EXISTS campaign_id;

-- 7. RLS on junction table
ALTER TABLE sponsor_resource_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sponsors manage their resource campaigns" ON sponsor_resource_campaigns;
CREATE POLICY "Sponsors manage their resource campaigns" ON sponsor_resource_campaigns
  FOR ALL
  USING (
    resource_id IN (
      SELECT id FROM sponsor_resource_library
      WHERE sponsor_id IN (
        SELECT id FROM sponsor_accounts WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    resource_id IN (
      SELECT id FROM sponsor_resource_library
      WHERE sponsor_id IN (
        SELECT id FROM sponsor_accounts WHERE auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Service role full access on sponsor_resource_campaigns" ON sponsor_resource_campaigns;
CREATE POLICY "Service role full access on sponsor_resource_campaigns" ON sponsor_resource_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_sponsor_resource_campaigns_resource_id ON sponsor_resource_campaigns(resource_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_resource_campaigns_campaign_id ON sponsor_resource_campaigns(campaign_id);
