'use server'

import { requireSponsor } from '@/lib/auth-context'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'
import { revalidatePath } from 'next/cache'

export interface IntegrationConnection {
  id: string
  platform: string
  status: string
  settings: Record<string, unknown>
  webhookUrls: string[]
  lastSyncAt: string | null
  errorMessage: string | null
  createdAt: string
}

export async function listIntegrations(): Promise<{
  connections: IntegrationConnection[]
  error?: string
}> {
  const { sponsorId, supabase } = await requireSponsor()

  const { data, error } = await supabase
    .from('integration_connections')
    .select('id, platform, status, settings, webhook_urls, last_sync_at, error_message, created_at')
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: false })

  if (error) return { connections: [], error: error.message }

  const connections: IntegrationConnection[] = (data ?? []).map((row) => ({
    id: row.id,
    platform: row.platform,
    status: row.status,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    webhookUrls: Array.isArray(row.webhook_urls) ? (row.webhook_urls as string[]) : [],
    lastSyncAt: row.last_sync_at,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }))

  return { connections }
}

export async function addZapierWebhook(
  webhookUrl: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { sponsorId, supabase } = await requireSponsor()

  try {
    new URL(webhookUrl)
  } catch {
    return { error: 'Please enter a valid webhook URL.' }
  }

  if (!webhookUrl.startsWith('https://')) {
    return { error: 'Webhook URL must use HTTPS.' }
  }

  const { data: existing } = await supabase
    .from('integration_connections')
    .select('id, webhook_urls')
    .eq('sponsor_id', sponsorId)
    .eq('platform', 'zapier')
    .maybeSingle()

  if (existing) {
    const currentUrls = Array.isArray(existing.webhook_urls)
      ? (existing.webhook_urls as string[])
      : []

    if (currentUrls.includes(webhookUrl)) {
      return { error: 'This webhook URL is already configured.' }
    }

    const { error } = await supabase
      .from('integration_connections')
      .update({
        webhook_urls: [...currentUrls, webhookUrl],
        status: 'connected',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('integration_connections')
      .insert({
        sponsor_id: sponsorId,
        platform: 'zapier',
        status: 'connected',
        webhook_urls: [webhookUrl],
        settings: {},
      })

    if (error) return { error: error.message }
  }

  await logImpersonationAction('mutation', '/sponsor/integrations', {
    action: 'addZapierWebhook',
    sponsorId,
  })
  revalidatePath('/sponsor/integrations')
  return {}
}

export async function removeZapierWebhook(
  webhookUrl: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { sponsorId, supabase } = await requireSponsor()

  const { data: existing } = await supabase
    .from('integration_connections')
    .select('id, webhook_urls')
    .eq('sponsor_id', sponsorId)
    .eq('platform', 'zapier')
    .maybeSingle()

  if (!existing) return { error: 'No Zapier connection found.' }

  const currentUrls = Array.isArray(existing.webhook_urls)
    ? (existing.webhook_urls as string[])
    : []

  const updatedUrls = currentUrls.filter((u) => u !== webhookUrl)

  if (updatedUrls.length === 0) {
    const { error } = await supabase
      .from('integration_connections')
      .delete()
      .eq('id', existing.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('integration_connections')
      .update({
        webhook_urls: updatedUrls,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) return { error: error.message }
  }

  await logImpersonationAction('mutation', '/sponsor/integrations', {
    action: 'removeZapierWebhook',
    sponsorId,
  })
  revalidatePath('/sponsor/integrations')
  return {}
}

export async function disconnectIntegration(
  connectionId: string
): Promise<{ error?: string }> {
  await blockImpersonationWrites()
  const { sponsorId, supabase } = await requireSponsor()

  const { error } = await supabase
    .from('integration_connections')
    .delete()
    .eq('id', connectionId)
    .eq('sponsor_id', sponsorId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/sponsor/integrations', {
    action: 'disconnectIntegration',
    connectionId,
    sponsorId,
  })
  revalidatePath('/sponsor/integrations')
  return {}
}

export async function getRecentEvents(
  connectionId?: string,
  limit = 20
): Promise<{
  events: Array<{
    id: string
    platform: string
    eventType: string
    status: string
    attemptCount: number
    errorMessage: string | null
    createdAt: string
    resolvedAt: string | null
  }>
  error?: string
}> {
  const { sponsorId, supabase } = await requireSponsor()

  let query = supabase
    .from('integration_events')
    .select('id, platform, event_type, status, attempt_count, error_message, created_at, resolved_at')
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (connectionId) {
    query = query.eq('connection_id', connectionId)
  }

  const { data, error } = await query

  if (error) return { events: [], error: error.message }

  return {
    events: (data ?? []).map((row) => ({
      id: row.id,
      platform: row.platform,
      eventType: row.event_type,
      status: row.status,
      attemptCount: row.attempt_count,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    })),
  }
}
