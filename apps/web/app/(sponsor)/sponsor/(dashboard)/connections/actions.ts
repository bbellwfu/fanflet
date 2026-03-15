'use server'

import { requireSponsor } from '@/lib/auth-context'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'
import { loadSponsorEntitlements } from '@fanflet/db'

export async function respondToConnection(
  connectionId: string,
  accept: boolean
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { sponsorId, supabase } = await requireSponsor()

  const { data: conn } = await supabase
    .from('sponsor_connections')
    .select('id, status')
    .eq('id', connectionId)
    .eq('sponsor_id', sponsorId)
    .single()

  if (!conn || conn.status !== 'pending') return { error: 'Connection not found or already responded.' }

  if (accept) {
    const entitlements = await loadSponsorEntitlements(supabase, sponsorId)
    const maxConnections = entitlements.limits.max_connections
    if (typeof maxConnections === 'number' && maxConnections !== -1) {
      const { count, error: countError } = await supabase
        .from('sponsor_connections')
        .select('id', { count: 'exact', head: true })
        .eq('sponsor_id', sponsorId)
        .eq('status', 'active')
        .is('ended_at', null)
      if (countError) return { error: 'Could not check connection limit.' }
      if ((count ?? 0) >= maxConnections) {
        return {
          error: `You've reached the limit of ${maxConnections} active connections on your ${entitlements.planDisplayName ?? 'Sponsor Connect'} plan. Upgrade to Sponsor Studio for unlimited connections.`,
        }
      }
    }
  }

  const { error } = await supabase
    .from('sponsor_connections')
    .update({
      status: accept ? 'active' : 'declined',
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)

  if (error) return { error: error.message }
  await logImpersonationAction('mutation', '/sponsor/dashboard/connections', { action: 'respondToConnection', connectionId, sponsorId })
  return {}
}

export async function endSponsorConnection(
  connectionId: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { sponsorId, supabase } = await requireSponsor()

  const { data: conn } = await supabase
    .from('sponsor_connections')
    .select('id, sponsor_id, status, ended_at')
    .eq('id', connectionId)
    .eq('sponsor_id', sponsorId)
    .single()

  if (!conn) return { error: 'Connection not found' }
  if (conn.status !== 'active') return { error: 'Only active connections can be ended' }
  if (conn.ended_at) return { error: 'This connection is already ended' }

  const { error } = await supabase
    .from('sponsor_connections')
    .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (error) return { error: error.message }
  await logImpersonationAction('mutation', '/sponsor/dashboard/connections', { action: 'endSponsorConnection', connectionId, sponsorId })
  return {}
}

export async function hideSpeakerConnectionFromView(
  connectionId: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { sponsorId, supabase } = await requireSponsor()

  const { data: conn } = await supabase
    .from('sponsor_connections')
    .select('id, sponsor_id')
    .eq('id', connectionId)
    .eq('sponsor_id', sponsorId)
    .single()

  if (!conn) return { error: 'Connection not found' }

  const { error } = await supabase
    .from('sponsor_connections')
    .update({ hidden_by_sponsor: true, updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  if (error) return { error: error.message }
  await logImpersonationAction('mutation', '/sponsor/dashboard/connections', { action: 'hideSpeakerConnectionFromView', connectionId, sponsorId })
  return {}
}
