'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getSpeakerContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id, name, email')
    .eq('auth_user_id', user.id)
    .single()

  if (!speaker) return null
  return { supabase, user, speaker }
}

export type SubscriberRow = {
  id: string
  email: string
  name: string | null
  created_at: string
  source_fanflet_id: string | null
  source_fanflet_title: string | null
}

export async function listSubscribers(): Promise<{
  data?: SubscriberRow[]
  error?: string
}> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { supabase, speaker } = ctx

  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('id, email, name, created_at, source_fanflet_id')
    .eq('speaker_id', speaker.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  // Gather unique fanflet IDs to fetch titles in one query
  const fanfletIds = [...new Set(
    (subscribers ?? []).map((s) => s.source_fanflet_id).filter(Boolean) as string[]
  )]

  let fanfletTitles: Record<string, string> = {}
  if (fanfletIds.length > 0) {
    const { data: fanflets } = await supabase
      .from('fanflets')
      .select('id, title')
      .in('id', fanfletIds)

    if (fanflets) {
      fanfletTitles = Object.fromEntries(fanflets.map((f) => [f.id, f.title]))
    }
  }

  const rows: SubscriberRow[] = (subscribers ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    created_at: s.created_at,
    source_fanflet_id: s.source_fanflet_id,
    source_fanflet_title: s.source_fanflet_id ? (fanfletTitles[s.source_fanflet_id] ?? null) : null,
  }))

  return { data: rows }
}

export async function deleteSubscriber(
  subscriberId: string
): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { supabase, speaker } = ctx

  const { error } = await supabase
    .from('subscribers')
    .delete()
    .eq('id', subscriberId)
    .eq('speaker_id', speaker.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/subscribers')
  return { success: true }
}

export async function deleteSubscribers(
  subscriberIds: string[]
): Promise<{ error?: string; success?: boolean; deletedCount?: number }> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { supabase, speaker } = ctx

  if (subscriberIds.length === 0) return { error: 'No subscribers selected' }

  const { error, count } = await supabase
    .from('subscribers')
    .delete({ count: 'exact' })
    .in('id', subscriberIds)
    .eq('speaker_id', speaker.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/subscribers')
  return { success: true, deletedCount: count ?? 0 }
}
