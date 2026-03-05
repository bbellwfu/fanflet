'use server'

import { createClient } from '@/lib/supabase/server'

export async function exportSponsorLeadsCsv(): Promise<{ error?: string; csv?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: sponsor } = await supabase
    .from('sponsor_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!sponsor) return { error: 'Sponsor not found' }

  const [leadsResult, hiddenResult] = await Promise.all([
    supabase
      .from('sponsor_leads')
      .select(`
        id, engagement_type, resource_title, created_at, fanflet_id,
        subscribers!inner ( email, name ),
        fanflets ( title, speaker_id, speakers ( name ) )
      `)
      .eq('sponsor_id', sponsor.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('sponsor_connections')
      .select('speaker_id')
      .eq('sponsor_id', sponsor.id)
      .eq('hidden_by_sponsor', true),
  ])

  if (leadsResult.error) return { error: leadsResult.error.message }
  const rows = leadsResult.data ?? []
  const hiddenSpeakerIds = new Set((hiddenResult.data ?? []).map((c) => c.speaker_id))

  const headers = ['Email', 'Name', 'Fanflet', 'Speaker', 'Resource', 'Engagement', 'Date']
  const lines = [headers.join(',')]

  for (const row of rows) {
    const r = row as Record<string, unknown> & { fanflets?: { title?: string; speaker_id?: string; speakers?: { name?: string | null } | { name?: string | null }[] } | { title?: string; speaker_id?: string; speakers?: { name?: string | null } | { name?: string | null }[] }[] }
    const fanflet = Array.isArray(r.fanflets) ? r.fanflets[0] : r.fanflets
    if (fanflet?.speaker_id && hiddenSpeakerIds.has(fanflet.speaker_id)) continue
    const sub = r.subscribers as { email?: string; name?: string | null } | { email?: string; name?: string | null }[] | null
    const subscriber = Array.isArray(sub) ? sub[0] : sub
    const sp = fanflet?.speakers
    const speaker = Array.isArray(sp) ? sp[0] : sp
    const email = subscriber?.email ?? ''
    const name = (subscriber?.name ?? '').replace(/"/g, '""')
    const fanfletTitle = (fanflet?.title ?? '').replace(/"/g, '""')
    const speakerName = (speaker?.name ?? '').replace(/"/g, '""')
    const resource = ((r.resource_title as string) ?? '').replace(/"/g, '""')
    const engagement = r.engagement_type as string
    const date = new Date((r.created_at as string)).toISOString()
    lines.push([email, `"${name}"`, `"${fanfletTitle}"`, `"${speakerName}"`, `"${resource}"`, engagement, date].join(','))
  }

  return { csv: lines.join('\n') }
}
