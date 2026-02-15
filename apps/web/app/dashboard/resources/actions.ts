'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureUrl } from '@/lib/utils'

async function getSpeakerId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  return speaker?.id ?? null
}

export type LibraryResource = {
  id: string
  type: string
  title: string
  description: string | null
  url: string | null
  file_path: string | null
  image_url: string | null
  section_name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export async function listLibraryResources(): Promise<{
  data?: LibraryResource[]
  error?: string
}> {
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('resource_library')
    .select('*')
    .eq('speaker_id', speakerId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { data: data ?? [] }
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
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

  if (!data.title?.trim()) return { error: 'Title is required' }
  if (!['link', 'file', 'text', 'sponsor'].includes(data.type)) {
    return { error: 'Invalid resource type' }
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
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

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
  const supabase = await createClient()
  const speakerId = await getSpeakerId()
  if (!speakerId) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('resource_library')
    .delete()
    .eq('id', id)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/resources')
  return { success: true }
}
