-- Ensure subscriber opt-ins distribute leads for connection-only setups.
-- If a fanflet has explicit sponsor attribution (fanflet_sponsors/resource_blocks),
-- use that mapping. Otherwise, fall back to active speaker-sponsor connections.
CREATE OR REPLACE FUNCTION public.subscribe_and_distribute_leads(
  p_email TEXT,
  p_name TEXT,
  p_speaker_id UUID,
  p_fanflet_id UUID,
  p_sponsor_consent BOOLEAN DEFAULT false
)
RETURNS TABLE (subscriber_id UUID, leads_created INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_sub_id UUID;
  v_lead_count INTEGER := 0;
  v_sponsor_id UUID;
BEGIN
  -- 1. Insert or update the subscriber
  INSERT INTO public.subscribers (email, name, speaker_id, source_fanflet_id, sponsor_consent)
  VALUES (p_email, p_name, p_speaker_id, p_fanflet_id, p_sponsor_consent)
  ON CONFLICT (email, speaker_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    source_fanflet_id = COALESCE(public.subscribers.source_fanflet_id, EXCLUDED.source_fanflet_id),
    sponsor_consent = EXCLUDED.sponsor_consent
  RETURNING id INTO v_sub_id;

  -- 2. Distribute leads if consent is given
  IF p_sponsor_consent THEN
    FOR v_sponsor_id IN (
      WITH explicit_sponsors AS (
        SELECT fs.sponsor_id
        FROM public.fanflet_sponsors fs
        WHERE fs.fanflet_id = p_fanflet_id
        UNION
        SELECT rb.sponsor_account_id AS sponsor_id
        FROM public.resource_blocks rb
        WHERE rb.fanflet_id = p_fanflet_id
          AND rb.sponsor_account_id IS NOT NULL
      ),
      fallback_connections AS (
        SELECT sc.sponsor_id
        FROM public.sponsor_connections sc
        WHERE sc.speaker_id = p_speaker_id
          AND sc.status = 'active'
          AND sc.ended_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM explicit_sponsors)
      )
      SELECT sponsor_id FROM explicit_sponsors
      UNION
      SELECT sponsor_id FROM fallback_connections
    ) LOOP
      -- 3. Only create lead if an active connection exists
      IF EXISTS (
        SELECT 1
        FROM public.sponsor_connections sc
        WHERE sc.speaker_id = p_speaker_id
          AND sc.sponsor_id = v_sponsor_id
          AND sc.status = 'active'
          AND sc.ended_at IS NULL
      ) THEN
        INSERT INTO public.sponsor_leads (
          subscriber_id,
          sponsor_id,
          fanflet_id,
          engagement_type,
          resource_title
        ) VALUES (
          v_sub_id,
          v_sponsor_id,
          p_fanflet_id,
          'fanflet_subscription',
          'Fanflet Subscription'
        )
        ON CONFLICT DO NOTHING;

        v_lead_count := v_lead_count + 1;
      END IF;
    END LOOP;
  END IF;

  subscriber_id := v_sub_id;
  leads_created := v_lead_count;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_and_distribute_leads(TEXT, TEXT, UUID, UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.subscribe_and_distribute_leads(TEXT, TEXT, UUID, UUID, BOOLEAN) TO authenticated;
