'use server'

import { requireSponsor } from '@/lib/auth-context'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

export async function exportSponsorLeadsCsv(): Promise<{ error?: string; csv?: string }> {
  const { sponsorId, demoEnvironmentId, supabase } = await requireSponsor()

  let leadsQuery = supabase
    .from('sponsor_leads')
    .select(`
      id, engagement_type, resource_title, created_at, fanflet_id,
      subscribers!inner ( email, name ),
      fanflets ( title, speaker_id, speakers ( name ) )
    `)
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: false })

  if (demoEnvironmentId) {
    const { data: speakersInDemo } = await supabase
      .from('speakers')
      .select('id')
      .eq('demo_environment_id', demoEnvironmentId)
    const speakerIds = (speakersInDemo ?? []).map((s) => s.id)
    if (speakerIds.length > 0) {
      const { data: fanfletsInDemo } = await supabase
        .from('fanflets')
        .select('id')
        .in('speaker_id', speakerIds)
      const fanfletIds = (fanfletsInDemo ?? []).map((f) => f.id)
      if (fanfletIds.length > 0) {
        leadsQuery = leadsQuery.in('fanflet_id', fanfletIds)
      } else {
        leadsQuery = leadsQuery.eq('fanflet_id', '00000000-0000-0000-0000-000000000000')
      }
    } else {
      leadsQuery = leadsQuery.eq('fanflet_id', '00000000-0000-0000-0000-000000000000')
    }
  }

  const [leadsResult, hiddenResult] = await Promise.all([
    leadsQuery,
    supabase
      .from('sponsor_connections')
      .select('speaker_id')
      .eq('sponsor_id', sponsorId)
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
