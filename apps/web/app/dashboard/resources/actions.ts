'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSpeakerEntitlements } from '@fanflet/db'
import { STORAGE_BUCKET } from '@fanflet/db/storage'
import { ensureUrl } from '@/lib/utils'

async function getSpeakerContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!speaker) return null
  return { supabase, user, speakerId: speaker.id }
}

export type LinkedFanflet = { id: string; title: string }

export type LibraryResource = {
  id: string
  type: string
  title: string
  description: string | null
  url: string | null
  file_path: string | null
  file_size_bytes: number | null
  file_type: string | null
  image_url: string | null
  section_name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  linked_fanflets_count: number
  linked_fanflets: LinkedFanflet[]
  download_count: number
}

export async function listLibraryResources(): Promise<{
  data?: LibraryResource[]
  error?: string
}> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { supabase, speakerId } = ctx

  const { data: items, error } = await supabase
    .from('resource_library')
    .select('*, resource_blocks(id, fanflet_id, fanflets(id, title))')
    .eq('speaker_id', speakerId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }

  // Get download counts from analytics_events for all library items via their resource_blocks
  const allBlockIds = (items ?? [])
    .flatMap((item) => {
      const blocks = item.resource_blocks as Array<{ id: string; fanflet_id: string }> | null
      return blocks?.map((b) => b.id) ?? []
    })

  let downloadCounts: Record<string, number> = {}
  if (allBlockIds.length > 0) {
    const { data: downloads } = await supabase
      .from('analytics_events')
      .select('resource_block_id')
      .eq('event_type', 'resource_download')
      .in('resource_block_id', allBlockIds)

    if (downloads) {
      for (const d of downloads) {
        if (d.resource_block_id) {
          downloadCounts[d.resource_block_id] = (downloadCounts[d.resource_block_id] ?? 0) + 1
        }
      }
    }
  }

  const enriched: LibraryResource[] = (items ?? []).map((item) => {
    const blocks = item.resource_blocks as Array<{
      id: string
      fanflet_id: string
      fanflets: { id: string; title: string } | null
    }> | null
    const blocksList = blocks ?? []
    const uniqueFanfletsMap = new Map<string, string>()
    for (const b of blocksList) {
      const f = b.fanflets
      if (f) uniqueFanfletsMap.set(f.id, f.title)
    }
    const linkedFanflets: LinkedFanflet[] = Array.from(uniqueFanfletsMap.entries()).map(
      ([id, title]) => ({ id, title: title || 'Untitled' })
    )
    const itemDownloads = blocksList.reduce((sum, b) => sum + (downloadCounts[b.id] ?? 0), 0)

    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      url: item.url,
      file_path: item.file_path,
      file_size_bytes: item.file_size_bytes ?? null,
      file_type: item.file_type ?? null,
      image_url: item.image_url,
      section_name: item.section_name,
      metadata: item.metadata as Record<string, unknown> | null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      linked_fanflets_count: linkedFanflets.length,
      linked_fanflets: linkedFanflets,
      download_count: itemDownloads,
    }
  })

  return { data: enriched }
}

export async function getSpeakerStorageUsage(): Promise<{
  usedBytes: number
  error?: string
}> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { usedBytes: 0, error: 'Not authenticated' }

  const { data } = await ctx.supabase.rpc('speaker_storage_used_bytes', {
    p_speaker_id: ctx.speakerId,
  })

  return { usedBytes: typeof data === 'number' ? data : 0 }
}

export async function createLibraryResource(data: {
  type: string
  title: string
  description?: string
  url?: string
  file_path?: string
  image_url?: string
  section_name?: string
  metadata?: Record<string, unknown>
}): Promise<{ error?: string; success?: boolean; id?: string }> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { supabase, speakerId } = ctx

  if (!data.title?.trim()) return { error: 'Title is required' }
  if (!['link', 'file', 'text', 'sponsor'].includes(data.type)) {
    return { error: 'Invalid resource type' }
  }
  if (data.type === 'sponsor') {
    const entitlements = await getSpeakerEntitlements(speakerId)
    if (!entitlements.features.has('sponsor_visibility')) return { error: 'Sponsor resources require a higher plan. Upgrade in Settings.' }
  }

  const { data: item, error } = await supabase
    .from('resource_library')
    .insert({
      speaker_id: speakerId,
      type: data.type,
      title: data.title.trim(),
      description: data.description ?? null,
      url: ensureUrl(data.url),
      file_path: data.file_path ?? null,
      image_url: data.image_url ?? null,
      section_name: data.section_name ?? (data.type === 'sponsor' ? 'Featured Partners' : 'Resources'),
      metadata: data.metadata ?? {},
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard/resources')
  return { success: true, id: item.id }
}

export async function updateLibraryResource(
  id: string,
  data: {
    title?: string
    description?: string
    url?: string
    file_path?: string
    image_url?: string
    section_name?: string
    metadata?: Record<string, unknown>
  }
): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { supabase, speakerId } = ctx

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.url !== undefined) updateData.url = ensureUrl(data.url)
  if (data.file_path !== undefined) updateData.file_path = data.file_path
  if (data.image_url !== undefined) updateData.image_url = data.image_url
  if (data.section_name !== undefined) updateData.section_name = data.section_name
  if (data.metadata !== undefined) updateData.metadata = data.metadata
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('resource_library')
    .update(updateData)
    .eq('id', id)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/resources')
  return { success: true }
}

export async function deleteLibraryResource(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }
  const { supabase, speakerId } = ctx

  // Fetch the item first to get the file_path for storage cleanup
  const { data: item } = await supabase
    .from('resource_library')
    .select('file_path, type')
    .eq('id', id)
    .eq('speaker_id', speakerId)
    .single()

  const { error } = await supabase
    .from('resource_library')
    .delete()
    .eq('id', id)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  // Clean up the file from storage if it's a file-type resource with a non-legacy path
  if (item?.type === 'file' && item.file_path && !item.file_path.startsWith('http')) {
    await supabase.storage.from(STORAGE_BUCKET).remove([item.file_path])
  }

  revalidatePath('/dashboard/resources')
  return { success: true }
}
