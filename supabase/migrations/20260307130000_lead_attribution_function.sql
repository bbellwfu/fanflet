-- =============================================================================
-- SECURITY DEFINER function for sponsor lead attribution
-- =============================================================================
-- Replaces the service-role client usage in /api/track by encapsulating the
-- multi-table validation and insert into a single function callable from the
-- anon client. The function validates: resource block has a sponsor, the
-- fanflet has a speaker, the sponsor-speaker connection is active, and the
-- subscriber gave consent.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_sponsor_lead(
  p_subscriber_id UUID,
  p_resource_block_id UUID,
  p_engagement_type TEXT
)
  RETURNS VOID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
DECLARE
  v_sponsor_id UUID;
  v_fanflet_id UUID;
  v_speaker_id UUID;
  v_resource_title TEXT;
  v_has_connection BOOLEAN;
  v_has_consent BOOLEAN;
BEGIN
  -- 1. Get the resource block's sponsor and fanflet
  SELECT rb.sponsor_account_id, rb.fanflet_id, rb.title
  INTO v_sponsor_id, v_fanflet_id, v_resource_title
  FROM public.resource_blocks rb
  WHERE rb.id = p_resource_block_id;

  IF v_sponsor_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Get the fanflet's speaker
  SELECT f.speaker_id
  INTO v_speaker_id
  FROM public.fanflets f
  WHERE f.id = v_fanflet_id;

  IF v_speaker_id IS NULL THEN
    RETURN;
  END IF;

  -- 3. Check for active sponsor-speaker connection
  SELECT EXISTS(
    SELECT 1 FROM public.sponsor_connections sc
    WHERE sc.speaker_id = v_speaker_id
      AND sc.sponsor_id = v_sponsor_id
      AND sc.status = 'active'
      AND sc.ended_at IS NULL
  ) INTO v_has_connection;

  IF NOT v_has_connection THEN
    RETURN;
  END IF;

  -- 4. Check subscriber consent
  SELECT s.sponsor_consent
  INTO v_has_consent
  FROM public.subscribers s
  WHERE s.id = p_subscriber_id;

  IF NOT coalesce(v_has_consent, false) THEN
    RETURN;
  END IF;

  -- 5. Insert the lead
  INSERT INTO public.sponsor_leads (
    subscriber_id, sponsor_id, fanflet_id,
    resource_block_id, engagement_type, resource_title
  ) VALUES (
    p_subscriber_id, v_sponsor_id, v_fanflet_id,
    p_resource_block_id, p_engagement_type, v_resource_title
  );
END;
$function$;

-- Allow anon and authenticated to call this function
GRANT EXECUTE ON FUNCTION public.record_sponsor_lead(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.record_sponsor_lead(UUID, UUID, TEXT) TO authenticated;
