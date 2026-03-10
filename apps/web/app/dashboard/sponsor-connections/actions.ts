'use server'

import { requireSpeaker } from '@/lib/auth-context'
import { revalidatePath } from 'next/cache'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'
import { requireFeature, entitlementErrorToResult } from '@/lib/entitlement-guards'

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
  const { speakerId, supabase } = await requireSpeaker()

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
  const { speakerId, supabase } = await requireSpeaker()

  try {
    await requireFeature(speakerId, 'sponsor_visibility')
  } catch (err) {
    return entitlementErrorToResult(err)
  }

  let sponsorId: string

  if (mode === 'id') {
    sponsorId = sponsorIdOrSlug
  } else {
    const slug = sponsorIdOrSlug.trim().toLowerCase()
    if (!slug) return { error: 'Enter a sponsor slug.' }

    const { data: sponsor } = await supabase
      .from('sponsor_accounts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!sponsor) return { error: 'No sponsor found with that slug. Ask the sponsor for their Fanflet sponsor link.' }
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
