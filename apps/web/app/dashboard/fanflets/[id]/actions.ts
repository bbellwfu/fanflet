'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureUrl } from '@/lib/utils'
import {
  computeExpirationDate,
  parseExpirationFromForm,
  resolveExpirationDate,
} from '@/lib/expiration'

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createClient>>, fanfletId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: fanflet } = await supabase
    .from('fanflets')
    .select('id, speaker_id')
    .eq('id', fanfletId)
    .single()

  if (!fanflet) return { error: 'Fanflet not found' }

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('id', fanflet.speaker_id)
    .single()

  if (!speaker) return { error: 'Not authorized to edit this fanflet' }

  return { fanflet }
}

export async function updateFanfletDetails(
  id: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const ownership = await verifyOwnership(supabase, id)
  if ('error' in ownership) return { error: ownership.error }

  const title = formData.get('title') as string
  const description = formData.get('description') as string || null
  const event_name = formData.get('event_name') as string
  const event_date = formData.get('event_date') as string || null
  const slug = formData.get('slug') as string
  const survey_question_id = formData.get('survey_question_id') as string || null
  const theme_config_raw = formData.get('theme_config') as string || null
  let theme_config: Record<string, unknown> = {}
  if (theme_config_raw) {
    try {
      theme_config = JSON.parse(theme_config_raw)
    } catch {
      // Keep default empty object
    }
  }

  const { data: existing } = await supabase
    .from('fanflets')
    .select('id')
    .eq('speaker_id', ownership.fanflet!.speaker_id)
    .eq('slug', slug)
    .neq('id', id)
    .maybeSingle()

  if (existing) {
    return { error: 'You already have a Fanflet with this URL slug' }
  }

  const basePayload: Record<string, unknown> = {
    title,
    description: description || null,
    event_name,
    event_date: event_date || null,
    slug,
    survey_question_id: survey_question_id || null,
    theme_config,
    updated_at: new Date().toISOString(),
  }

  const expiration = parseExpirationFromForm(formData)
  const { data: currentFanflet } = await supabase
    .from('fanflets')
    .select('published_at')
    .eq('id', id)
    .single()
  const referenceDate = currentFanflet?.published_at
    ? new Date(currentFanflet.published_at)
    : new Date()
  const expiration_date = resolveExpirationDate(expiration, referenceDate)

  const fullPayload = {
    ...basePayload,
    expiration_date: expiration_date ?? null,
    expiration_preset: expiration.preset,
    show_expiration_notice: expiration.showExpirationNotice,
  }

  let result = await supabase.from('fanflets').update(fullPayload).eq('id', id)
  if (result.error && (result.error.code === '42703' || result.error.code === 'PGRST204' || result.error.message?.includes('schema cache'))) {
    result = await supabase.from('fanflets').update(basePayload).eq('id', id)
  }

  if (result.error) return { error: result.error.message }

  revalidatePath(`/dashboard/fanflets/${id}`)
  revalidatePath(`/dashboard/fanflets/${id}/qr`)
  revalidatePath('/dashboard/fanflets')
  return { success: true }
}

export async function publishFanflet(id: string): Promise<{ error?: string; success?: boolean; firstPublished?: boolean }> {
  const supabase = await createClient()
  const ownership = await verifyOwnership(supabase, id)
  if ('error' in ownership) return { error: ownership.error }

  const { count: existingPublishedCount } = await supabase
    .from('fanflets')
    .select('id', { count: 'exact', head: true })
    .eq('speaker_id', ownership.fanflet!.speaker_id)
    .eq('status', 'published')

  const publishedAt = new Date()
  const basePayload: Record<string, unknown> = {
    status: 'published',
    published_at: publishedAt.toISOString(),
    updated_at: publishedAt.toISOString(),
  }

  const { data: current, error: presetErr } = await supabase
    .from('fanflets')
    .select('expiration_preset')
    .eq('id', id)
    .single()

  if (!presetErr) {
    const preset = current?.expiration_preset as string | undefined
    if (preset === '30d' || preset === '60d' || preset === '90d') {
      basePayload.expiration_date = computeExpirationDate(
        preset as '30d' | '60d' | '90d',
        null,
        publishedAt
      )
    }
  }

  let result = await supabase.from('fanflets').update(basePayload).eq('id', id)
  if (result.error && (result.error.code === '42703' || result.error.code === 'PGRST204' || result.error.message?.includes('schema cache'))) {
    const { expiration_date: _drop, ...safePayload } = basePayload
    result = await supabase.from('fanflets').update(safePayload).eq('id', id)
  }

  if (result.error) return { error: result.error.message }

  revalidatePath(`/dashboard/fanflets/${id}`)
  revalidatePath('/dashboard/fanflets')
  revalidatePath('/dashboard', 'layout')
  return { success: true, firstPublished: (existingPublishedCount ?? 0) === 0 }
}

export async function unpublishFanflet(id: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const ownership = await verifyOwnership(supabase, id)
  if ('error' in ownership) return { error: ownership.error }

  const { error } = await supabase
    .from('fanflets')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/fanflets/${id}`)
  revalidatePath('/dashboard/fanflets')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function addResourceBlock(
  fanfletId: string,
  data: {
    type: string
    title?: string
    description?: string
    url?: string
    file_path?: string
    image_url?: string
    section_name?: string
    metadata?: Record<string, unknown>
  }
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const supabase = await createClient()
  const ownership = await verifyOwnership(supabase, fanfletId)
  if ('error' in ownership) return { error: ownership.error }

  const { data: maxOrder } = await supabase
    .from('resource_blocks')
    .select('display_order')
    .eq('fanflet_id', fanfletId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrder?.display_order ?? -1) + 1

  const insertData: Record<string, unknown> = {
    fanflet_id: fanfletId,
    type: data.type,
    title: data.title ?? '',
    description: data.description ?? null,
    url: ensureUrl(data.url),
    file_path: data.file_path ?? null,
    image_url: data.image_url ?? null,
    display_order: nextOrder,
    section_name: data.section_name ?? (data.type === 'sponsor' ? 'Featured Partners' : 'Resources'),
    metadata: data.metadata ?? {},
  }

  const { data: block, error } = await supabase
    .from('resource_blocks')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/fanflets/${fanfletId}`)
  return { success: true, id: block.id }
}

export async function updateResourceBlock(
  blockId: string,
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

  const { data: block } = await supabase
    .from('resource_blocks')
    .select('fanflet_id')
    .eq('id', blockId)
    .single()

  if (!block) return { error: 'Block not found' }

  const ownership = await verifyOwnership(supabase, block.fanflet_id)
  if ('error' in ownership) return { error: ownership.error }

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
    .from('resource_blocks')
    .update(updateData)
    .eq('id', blockId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/fanflets/${block.fanflet_id}`)
  return { success: true }
}

export async function deleteResourceBlock(blockId: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { data: block } = await supabase
    .from('resource_blocks')
    .select('fanflet_id')
    .eq('id', blockId)
    .single()

  if (!block) return { error: 'Block not found' }

  const ownership = await verifyOwnership(supabase, block.fanflet_id)
  if ('error' in ownership) return { error: ownership.error }

  const { error } = await supabase
    .from('resource_blocks')
    .delete()
    .eq('id', blockId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/fanflets/${block.fanflet_id}`)
  return { success: true }
}

export async function addLibraryBlockToFanflet(
  fanfletId: string,
  libraryItemId: string,
  mode: 'static' | 'dynamic'
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const supabase = await createClient()
  const ownership = await verifyOwnership(supabase, fanfletId)
  if ('error' in ownership) return { error: ownership.error }

  // Fetch the library item
  const { data: libItem, error: libError } = await supabase
    .from('resource_library')
    .select('*')
    .eq('id', libraryItemId)
    .single()

  if (libError || !libItem) return { error: 'Library resource not found' }

  // Calculate next display_order
  const { data: maxOrder } = await supabase
    .from('resource_blocks')
    .select('display_order')
    .eq('fanflet_id', fanfletId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrder?.display_order ?? -1) + 1

  if (mode === 'static') {
    // Static copy: duplicate all fields, no library_item_id
    const { data: block, error } = await supabase
      .from('resource_blocks')
      .insert({
        fanflet_id: fanfletId,
        type: libItem.type,
        title: libItem.title,
        description: libItem.description,
        url: libItem.url,
        file_path: libItem.file_path,
        image_url: libItem.image_url,
        display_order: nextOrder,
        section_name: libItem.section_name,
        metadata: libItem.metadata ?? {},
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/fanflets/${fanfletId}`)
    return { success: true, id: block.id }
  } else {
    // Dynamic link: store reference to library item
    const { data: block, error } = await supabase
      .from('resource_blocks')
      .insert({
        fanflet_id: fanfletId,
        type: libItem.type,
        title: libItem.title,
        description: libItem.description,
        url: libItem.url,
        file_path: libItem.file_path,
        image_url: libItem.image_url,
        display_order: nextOrder,
        section_name: libItem.section_name,
        metadata: libItem.metadata ?? {},
        library_item_id: libraryItemId,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/fanflets/${fanfletId}`)
    return { success: true, id: block.id }
  }
}

export async function reorderBlock(
  blockId: string,
  direction: 'up' | 'down'
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { data: block } = await supabase
    .from('resource_blocks')
    .select('id, fanflet_id, display_order')
    .eq('id', blockId)
    .single()

  if (!block) return { error: 'Block not found' }

  const ownership = await verifyOwnership(supabase, block.fanflet_id)
  if ('error' in ownership) return { error: ownership.error }

  const { data: blocks } = await supabase
    .from('resource_blocks')
    .select('id, display_order')
    .eq('fanflet_id', block.fanflet_id)
    .order('display_order', { ascending: true })

  if (!blocks || blocks.length < 2) return { success: true }

  const myIndex = blocks.findIndex((b) => b.id === blockId)
  if (myIndex === -1) return { error: 'Block not found' }

  const swapIndex = direction === 'up' ? myIndex - 1 : myIndex + 1
  if (swapIndex < 0 || swapIndex >= blocks.length) return { success: true }

  const myOrder = blocks[myIndex].display_order
  const swapOrder = blocks[swapIndex].display_order

  const { error: err1 } = await supabase
    .from('resource_blocks')
    .update({ display_order: swapOrder, updated_at: new Date().toISOString() })
    .eq('id', blockId)

  if (err1) return { error: err1.message }

  const { error: err2 } = await supabase
    .from('resource_blocks')
    .update({ display_order: myOrder, updated_at: new Date().toISOString() })
    .eq('id', blocks[swapIndex].id)

  if (err2) return { error: err2.message }

  revalidatePath(`/dashboard/fanflets/${block.fanflet_id}`)
  return { success: true }
}
