'use server'

import { revalidatePath } from 'next/cache'
import { requireSpeaker } from '@/lib/auth-context'
import { getSpeakerEntitlements } from '@fanflet/db'
import { STORAGE_BUCKET } from '@fanflet/db/storage'
import { ensureUrl } from '@/lib/utils'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

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
  default_sponsor_account_id: string | null
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
  const { supabase, speakerId } = await requireSpeaker()

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

  const downloadCounts: Record<string, number> = {}
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
      default_sponsor_account_id: item.default_sponsor_account_id ?? null,
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
  const { supabase, speakerId } = await requireSpeaker()

  const { data } = await supabase.rpc('speaker_storage_used_bytes', {
    p_speaker_id: speakerId,
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
  default_sponsor_account_id?: string | null
}): Promise<{ error?: string; success?: boolean; id?: string }> {
  await blockImpersonationWrites()
  const { supabase, speakerId } = await requireSpeaker()

  if (!data.title?.trim()) return { error: 'Title is required' }
  if (!['link', 'file', 'text', 'sponsor'].includes(data.type)) {
    return { error: 'Invalid resource type' }
  }
  if (data.type === 'sponsor') {
    const entitlements = await getSpeakerEntitlements(speakerId)
    if (!entitlements.features.has('sponsor_visibility')) return { error: 'Sponsor resources require a higher plan. Upgrade in Settings.' }
    if (data.default_sponsor_account_id) {
      const { data: conn } = await supabase
        .from('sponsor_connections')
        .select('id')
        .eq('speaker_id', speakerId)
        .eq('sponsor_id', data.default_sponsor_account_id)
        .eq('status', 'active')
        .maybeSingle()
      if (!conn) return { error: 'Selected sponsor is not an active connection.' }
    }
  }

  const insertPayload: Record<string, unknown> = {
    speaker_id: speakerId,
    type: data.type,
    title: data.title.trim(),
    description: data.description ?? null,
    url: ensureUrl(data.url),
    file_path: data.file_path ?? null,
    image_url: data.image_url ?? null,
    section_name: data.section_name ?? (data.type === 'sponsor' ? 'Featured Partners' : 'Resources'),
    metadata: data.metadata ?? {},
  }
  if (data.type === 'sponsor' && data.default_sponsor_account_id !== undefined) {
    insertPayload.default_sponsor_account_id = data.default_sponsor_account_id || null
  }

  const { data: item, error } = await supabase
    .from('resource_library')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/resources', { action: 'createLibraryResource', speaker_id: speakerId, id: item.id })
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
    default_sponsor_account_id?: string | null
  }
): Promise<{ error?: string; success?: boolean }> {
  await blockImpersonationWrites()
  const { supabase, speakerId } = await requireSpeaker()

  if (data.default_sponsor_account_id !== undefined) {
    const { data: item } = await supabase
      .from('resource_library')
      .select('type')
      .eq('id', id)
      .eq('speaker_id', speakerId)
      .single()
    if (item?.type === 'sponsor' && data.default_sponsor_account_id) {
      const { data: conn } = await supabase
        .from('sponsor_connections')
        .select('id')
        .eq('speaker_id', speakerId)
        .eq('sponsor_id', data.default_sponsor_account_id)
        .eq('status', 'active')
        .maybeSingle()
      if (!conn) return { error: 'Selected sponsor is not an active connection.' }
    }
  }

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.url !== undefined) updateData.url = ensureUrl(data.url)
  if (data.file_path !== undefined) updateData.file_path = data.file_path
  if (data.image_url !== undefined) updateData.image_url = data.image_url
  if (data.section_name !== undefined) updateData.section_name = data.section_name
  if (data.metadata !== undefined) updateData.metadata = data.metadata
  if (data.default_sponsor_account_id !== undefined) updateData.default_sponsor_account_id = data.default_sponsor_account_id || null
  updateData.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('resource_library')
    .update(updateData)
    .eq('id', id)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/resources', { action: 'updateLibraryResource', speaker_id: speakerId, id })
  revalidatePath('/dashboard/resources')
  return { success: true }
}

export type DeleteLibraryResourceOptions = {
  /** When the resource is linked on fanflets: convert each block to a static copy, or remove blocks. */
  handleLinkedBlocks: 'convert_to_static' | 'remove_from_fanflets'
}

export async function deleteLibraryResource(
  id: string,
  options?: DeleteLibraryResourceOptions
): Promise<{ error?: string; success?: boolean; needsChoice?: boolean }> {
  await blockImpersonationWrites()
  const { supabase, speakerId } = await requireSpeaker()

  // Fetch the full library item (for storage cleanup and for convert_to_static)
  const { data: item, error: fetchError } = await supabase
    .from('resource_library')
    .select('*')
    .eq('id', id)
    .eq('speaker_id', speakerId)
    .single()

  if (fetchError || !item) return { error: 'Resource not found' }

  // Find blocks that reference this library item (dynamic blocks on this speaker's fanflets)
  const { data: linkedBlocks } = await supabase
    .from('resource_blocks')
    .select('id, fanflet_id')
    .eq('library_item_id', id)

  const blocks = linkedBlocks ?? []
  if (blocks.length > 0 && !options?.handleLinkedBlocks) {
    return { error: 'Choose how to handle linked fanflet blocks.', needsChoice: true }
  }

  if (options?.handleLinkedBlocks === 'convert_to_static') {
    // Copy library content into each block and clear library_item_id
    for (const block of blocks) {
      const { error: updateError } = await supabase
        .from('resource_blocks')
        .update({
          title: item.title,
          description: item.description ?? null,
          url: item.url ? ensureUrl(item.url) : null,
          file_path: item.file_path ?? null,
          image_url: item.image_url ?? null,
          section_name: item.section_name ?? null,
          metadata: item.metadata ?? {},
          library_item_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', block.id)

      if (updateError) return { error: updateError.message }
      revalidatePath(`/dashboard/fanflets/${block.fanflet_id}`)
    }
  } else if (options?.handleLinkedBlocks === 'remove_from_fanflets') {
    for (const block of blocks) {
      const { error: deleteError } = await supabase
        .from('resource_blocks')
        .delete()
        .eq('id', block.id)

      if (deleteError) return { error: deleteError.message }
      revalidatePath(`/dashboard/fanflets/${block.fanflet_id}`)
    }
  }

  const { error } = await supabase
    .from('resource_library')
    .delete()
    .eq('id', id)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/resources', { action: 'deleteLibraryResource', speaker_id: speakerId, id })
  if (item.type === 'file' && item.file_path && !item.file_path.startsWith('http')) {
    await supabase.storage.from(STORAGE_BUCKET).remove([item.file_path])
  }

  revalidatePath('/dashboard/resources')
  return { success: true }
}
