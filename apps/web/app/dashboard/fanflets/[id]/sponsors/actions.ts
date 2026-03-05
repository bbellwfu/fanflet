'use server'

import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/config'

const REPORT_TOKEN_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const REPORT_TOKEN_LENGTH = 21

function generateReportToken(): string {
  const bytes = new Uint8Array(REPORT_TOKEN_LENGTH)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  return Array.from(bytes, (b) => REPORT_TOKEN_ALPHABET[b % REPORT_TOKEN_ALPHABET.length]).join('')
}

export async function exportSponsorReportCsv(
  fanfletId: string,
  sponsorId: string | null
): Promise<{ error?: string; csv?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!speaker) return { error: 'Speaker not found' }

  const { data: fanflet } = await supabase
    .from('fanflets')
    .select('id')
    .eq('id', fanfletId)
    .eq('speaker_id', speaker.id)
    .single()
  if (!fanflet) return { error: 'Fanflet not found' }

  let query = supabase
    .from('sponsor_leads')
    .select(`
      id, engagement_type, resource_title, created_at,
      subscribers!inner ( email, name ),
      sponsor_accounts!inner ( company_name )
    `)
    .eq('fanflet_id', fanfletId)
    .order('created_at', { ascending: false })

  if (sponsorId) {
    query = query.eq('sponsor_id', sponsorId)
  }

  const { data: rows, error } = await query

  if (error) return { error: error.message }

  const headers = ['Email', 'Name', 'Company', 'Resource', 'Engagement', 'Date']
  const lines = [headers.join(',')]

  for (const row of rows ?? []) {
    const r = row as Record<string, unknown>
    const sub = r.subscribers as { email?: string; name?: string | null } | { email?: string; name?: string | null }[] | null
    const subscriber = Array.isArray(sub) ? sub[0] : sub
    const acc = r.sponsor_accounts as { company_name?: string } | { company_name?: string }[] | null
    const sponsorAccount = Array.isArray(acc) ? acc[0] : acc
    const email = subscriber?.email ?? ''
    const name = (subscriber?.name ?? '').replace(/"/g, '""')
    const company = (sponsorAccount?.company_name ?? '').replace(/"/g, '""')
    const resource = ((r.resource_title as string) ?? '').replace(/"/g, '""')
    const engagement = r.engagement_type as string
    const date = new Date((r.created_at as string)).toISOString()
    lines.push([email, `"${name}"`, `"${company}"`, `"${resource}"`, engagement, date].join(','))
  }

  const csv = lines.join('\n')
  return { csv }
}

const REPORT_EXPIRY_DAYS = 7

export async function createSponsorReportToken(
  fanfletId: string,
  sponsorId: string
): Promise<{ error?: string; token?: string; url?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!speaker) return { error: 'Speaker not found' }

  const { data: fanflet } = await supabase
    .from('fanflets')
    .select('id')
    .eq('id', fanfletId)
    .eq('speaker_id', speaker.id)
    .single()
  if (!fanflet) return { error: 'Fanflet not found' }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REPORT_EXPIRY_DAYS)

  const token = generateReportToken()

  const { error } = await supabase.from('sponsor_report_tokens').insert({
    token,
    fanflet_id: fanfletId,
    sponsor_id: sponsorId,
    created_by_speaker_id: speaker.id,
    expires_at: expiresAt.toISOString(),
  })

  if (error) return { error: error.message }

  const base = getSiteUrl()
  const url = `${base}/reports/${token}`

  return { token, url }
}
