-- Backfill demo_environment_id for existing demo speakers and sponsor_accounts.
-- Idempotent: only updates rows where demo_environment_id IS NULL.

-- Speaker demos: set speaker's demo_environment_id
UPDATE public.speakers s
SET demo_environment_id = de.id
FROM public.demo_environments de
WHERE de.speaker_id = s.id
  AND de.demo_type = 'speaker'
  AND de.status = 'active'
  AND s.demo_environment_id IS NULL;

-- Speaker demos: set sponsor_accounts that appear in seed_manifest.sponsor_account_ids
UPDATE public.sponsor_accounts sa
SET demo_environment_id = de.id
FROM public.demo_environments de,
     jsonb_array_elements_text(de.seed_manifest->'sponsor_account_ids') AS aid
WHERE sa.id = (aid)::uuid
  AND de.demo_type = 'speaker'
  AND de.status = 'active'
  AND sa.demo_environment_id IS NULL;

-- Sponsor demos: set sponsor_account's demo_environment_id
UPDATE public.sponsor_accounts sa
SET demo_environment_id = de.id
FROM public.demo_environments de
WHERE de.sponsor_id = sa.id
  AND de.demo_type = 'sponsor'
  AND de.status = 'active'
  AND sa.demo_environment_id IS NULL;

-- Sponsor demos: set KOL speakers from seed_manifest.demo_speakers
UPDATE public.speakers s
SET demo_environment_id = de.id
FROM public.demo_environments de,
     jsonb_array_elements(de.seed_manifest->'demo_speakers') AS kol
WHERE s.id = ((kol->>'speaker_id'))::uuid
  AND de.demo_type = 'sponsor'
  AND de.status = 'active'
  AND s.demo_environment_id IS NULL;
