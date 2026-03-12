'use server'

import { requireSpeaker } from '@/lib/auth-context'
import { revalidatePath } from 'next/cache'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'
import { requireFeature, entitlementErrorToResult } from '@/lib/entitlement-guards'
import { addSponsorLibraryBlockToFanflet } from '@/app/dashboard/fanflets/[id]/actions'

interface AvailableSponsor {
  id: string
  company_name: string
  slug: string
  logo_url: string | null
  industry: string | null
  description: string | null
}

export async function listAvailableSponsors(): Promise<{
  sponsors: AvailableSponsor[]
  error?: string
}> {
  const { speakerId, demoEnvironmentId, supabase } = await requireSpeaker()

  try {
    await requireFeature(speakerId, 'sponsor_visibility')
  } catch (err) {
    return { sponsors: [], ...entitlementErrorToResult(err) }
  }

  const { data: existingConnections } = await supabase
    .from('sponsor_connections')
    .select('sponsor_id, status, ended_at')
    .eq('speaker_id', speakerId)
    .in('status', ['pending', 'active'])

  const excludedIds = (existingConnections ?? [])
    .filter((c) => c.status === 'pending' || (c.status === 'active' && c.ended_at == null))
    .map((c) => c.sponsor_id)

  let query = supabase
    .from('sponsor_accounts')
    .select('id, company_name, slug, logo_url, industry, description')
    .eq('is_verified', true)
    .order('company_name')

  if (demoEnvironmentId) {
    query = query.eq('demo_environment_id', demoEnvironmentId)
  } else {
    query = query.neq('is_demo', true)
  }

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`)
  }

  const { data: sponsors, error } = await query

  if (error) return { sponsors: [], error: error.message }
  return { sponsors: sponsors ?? [] }
}

export async function requestSponsorConnection(
  sponsorIdOrSlug: string,
  message: string | null,
  mode: 'id' | 'slug' = 'slug'
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { speakerId, demoEnvironmentId, supabase } = await requireSpeaker()

  try {
    await requireFeature(speakerId, 'sponsor_visibility')
  } catch (err) {
    return entitlementErrorToResult(err)
  }

  let sponsorId: string

  if (mode === 'id') {
    const { data: sponsor } = await supabase
      .from('sponsor_accounts')
      .select('id, demo_environment_id, is_demo')
      .eq('id', sponsorIdOrSlug)
      .single()
    if (!sponsor) return { error: 'No sponsor found.' }
    if (demoEnvironmentId) {
      if (sponsor.demo_environment_id !== demoEnvironmentId) {
        return { error: 'No sponsor found with that slug. Ask the sponsor for their Fanflet sponsor link.' }
      }
    } else if (sponsor.is_demo) {
      return { error: 'No sponsor found with that slug. Ask the sponsor for their Fanflet sponsor link.' }
    }
    sponsorId = sponsor.id
  } else {
    const slug = sponsorIdOrSlug.trim().toLowerCase()
    if (!slug) return { error: 'Enter a sponsor slug.' }

    let slugQuery = supabase
      .from('sponsor_accounts')
      .select('id, is_demo, demo_environment_id')
      .eq('slug', slug)
    if (demoEnvironmentId) {
      slugQuery = slugQuery.eq('demo_environment_id', demoEnvironmentId)
    }
    const { data: sponsor } = await slugQuery.single()

    if (!sponsor) return { error: 'No sponsor found with that slug. Ask the sponsor for their Fanflet sponsor link.' }
    if (!demoEnvironmentId && sponsor.is_demo) return { error: 'No sponsor found with that slug. Ask the sponsor for their Fanflet sponsor link.' }
    sponsorId = sponsor.id
  }

  const { data: existing } = await supabase
    .from('sponsor_connections')
    .select('id, status, ended_at')
    .eq('sponsor_id', sponsorId)
    .eq('speaker_id', speakerId)
    .maybeSingle()

  if (existing) {
    const isActiveAndNotEnded = existing.status === 'active' && existing.ended_at == null
    if (existing.status === 'pending' || isActiveAndNotEnded) {
      return { error: 'You already have a connection request with this sponsor.' }
    }
    // Revoked, declined, or ended: reuse the row and set back to pending
    const { error: updateError } = await supabase
      .from('sponsor_connections')
      .update({
        status: 'pending',
        initiated_by: 'speaker',
        message: message?.trim() || null,
        responded_at: null,
        ended_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (updateError) return { error: updateError.message }
    await logImpersonationAction('mutation', '/dashboard/sponsor-connections', { action: 'requestSponsorConnection', speaker_id: speakerId, sponsor_id: sponsorId, connection_id: existing.id, reused: true })
    return {}
  }

  const { error } = await supabase.from('sponsor_connections').insert({
    sponsor_id: sponsorId,
    speaker_id: speakerId,
    status: 'pending',
    initiated_by: 'speaker',
    message: message?.trim() || null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'You already have a connection request with this sponsor.' }
    return { error: error.message }
  }
  await logImpersonationAction('mutation', '/dashboard/sponsor-connections', { action: 'requestSponsorConnection', speaker_id: speakerId, sponsor_id: sponsorId })
  return {}
}

export async function rescindSponsorConnection(
  connectionId: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  try {
    await requireFeature(speakerId, 'sponsor_visibility')
  } catch (err) {
    return entitlementErrorToResult(err)
  }

  const { data: conn, error: fetchError } = await supabase
    .from('sponsor_connections')
    .select('id, speaker_id, status, initiated_by')
    .eq('id', connectionId)
    .single()

  if (fetchError || !conn) return { error: 'Connection not found' }
  if (conn.speaker_id !== speakerId) return { error: 'Not authorized to cancel this request' }
  if (conn.status !== 'pending') return { error: 'Only pending requests can be cancelled' }
  if (conn.initiated_by !== 'speaker') return { error: 'Only requests you sent can be cancelled' }

  const { error: updateError } = await supabase
    .from('sponsor_connections')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (updateError) return { error: updateError.message }
  await logImpersonationAction('mutation', '/dashboard/sponsor-connections', { action: 'rescindSponsorConnection', speaker_id: speakerId, connection_id: connectionId })
  revalidatePath('/dashboard/sponsor-connections')
  return {}
}

export async function endSponsorConnection(
  connectionId: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  try {
    await requireFeature(speakerId, 'sponsor_visibility')
  } catch (err) {
    return entitlementErrorToResult(err)
  }

  const { data: conn, error: fetchError } = await supabase
    .from('sponsor_connections')
    .select('id, speaker_id, status, ended_at')
    .eq('id', connectionId)
    .single()

  if (fetchError || !conn) return { error: 'Connection not found' }
  if (conn.speaker_id !== speakerId) return { error: 'Not authorized to end this connection' }
  if (conn.status !== 'active') return { error: 'Only active connections can be ended' }
  if (conn.ended_at) return { error: 'This connection is already ended' }

  const { error: updateError } = await supabase
    .from('sponsor_connections')
    .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (updateError) return { error: updateError.message }
  await logImpersonationAction('mutation', '/dashboard/sponsor-connections', { action: 'endSponsorConnection', speaker_id: speakerId, connection_id: connectionId })
  revalidatePath('/dashboard/sponsor-connections')
  return {}
}

export async function hideSponsorConnectionFromView(
  connectionId: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  try {
    await requireFeature(speakerId, 'sponsor_visibility')
  } catch (err) {
    return entitlementErrorToResult(err)
  }

  const { data: conn } = await supabase
    .from('sponsor_connections')
    .select('id, speaker_id')
    .eq('id', connectionId)
    .single()

  if (!conn || conn.speaker_id !== speakerId) return { error: 'Connection not found' }

  const { error } = await supabase
    .from('sponsor_connections')
    .update({ hidden_by_speaker: true, updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (error) return { error: error.message }
  await logImpersonationAction('mutation', '/dashboard/sponsor-connections', { action: 'hideSponsorConnectionFromView', speaker_id: speakerId, connection_id: connectionId })
  revalidatePath('/dashboard/sponsor-connections')
  return {}
}

/**
 * Add a single sponsor catalog item to one of the speaker's fanflets,
 * accessible directly from the Sponsor Connections page.
 * Delegates auth + connection verification to addSponsorLibraryBlockToFanflet.
 */
export async function addSponsorResourceToFanflet(
  fanfletId: string,
  sponsorResourceItemId: string
): Promise<{ error?: string; success?: boolean }> {
  await blockImpersonationWrites()
  const { speakerId } = await requireSpeaker()

  try {
    await requireFeature(speakerId, 'sponsor_visibility')
  } catch (err) {
    return entitlementErrorToResult(err)
  }

  const result = await addSponsorLibraryBlockToFanflet(fanfletId, sponsorResourceItemId)
  if (result.error) return { error: result.error }

  await logImpersonationAction('mutation', '/dashboard/sponsor-connections', {
    action: 'addSponsorResourceToFanflet',
    speaker_id: speakerId,
    fanflet_id: fanfletId,
    sponsor_resource_item_id: sponsorResourceItemId,
  })
  revalidatePath('/dashboard/sponsor-connections')
  revalidatePath(`/dashboard/fanflets/${fanfletId}`)
  return { success: true }
}
