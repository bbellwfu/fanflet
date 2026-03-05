'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSpeakerEntitlements } from '@fanflet/db'
import { DEFAULT_THEME_ID } from '@/lib/themes'
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
  const entitlements = await getSpeakerEntitlements(ownership.fanflet!.speaker_id)
  const hasSurveys = entitlements.features.has('surveys_session_feedback')
  const survey_question_id_raw = formData.get('survey_question_id') as string || null
  const survey_question_id = hasSurveys ? survey_question_id_raw : null

  const theme_config_raw = formData.get('theme_config') as string || null
  let theme_config: Record<string, unknown> = {}
  if (theme_config_raw) {
    try {
      theme_config = JSON.parse(theme_config_raw)
    } catch {
      // Keep default empty object
    }
  }

  const allowMultipleThemes = entitlements.features.has('multiple_theme_colors')
  if (!allowMultipleThemes) {
    theme_config = { preset: DEFAULT_THEME_ID }
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

  let expiration = parseExpirationFromForm(formData)
  const allowCustomExpiration = entitlements.features.has('custom_expiration')
  if (!allowCustomExpiration && expiration.preset !== 'none' && expiration.preset !== '14d') {
    expiration = { ...expiration, preset: '14d' as const, customDate: null }
  }

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
    sponsor_account_id?: string | null
  }
): Promise<{ error?: string; success?: boolean; id?: string }> {
  const supabase = await createClient()
  const ownership = await verifyOwnership(supabase, fanfletId)
  if ('error' in ownership) return { error: ownership.error }

  const speakerId = ownership.fanflet!.speaker_id

  if (data.type === 'sponsor') {
    const entitlements = await getSpeakerEntitlements(speakerId)
    if (!entitlements.features.has('sponsor_visibility')) return { error: 'Sponsor blocks require a higher plan. Upgrade in Settings.' }
    if (data.sponsor_account_id) {
      const { data: conn } = await supabase
        .from('sponsor_connections')
        .select('id')
        .eq('speaker_id', speakerId)
        .eq('sponsor_id', data.sponsor_account_id)
        .eq('status', 'active')
        .maybeSingle()
      if (!conn) return { error: 'Selected sponsor is not connected. Choose a connected sponsor or leave unlinked.' }
    }
  }

  const sectionName = data.section_name ?? (data.type === 'sponsor' ? 'Featured Partners' : 'Resources')
  const title = data.title?.trim() ?? ''

  // All resources flow through the library (PRD §3.4). Create library entry first, then block with library_item_id.
  const { data: libItem, error: libError } = await supabase
    .from('resource_library')
    .insert({
      speaker_id: speakerId,
      type: data.type,
      title: title || 'Untitled',
      description: data.description ?? null,
      url: ensureUrl(data.url),
      file_path: data.file_path ?? null,
      image_url: data.image_url ?? null,
      section_name: sectionName,
      metadata: data.metadata ?? {},
    })
    .select('id')
    .single()

  if (libError) return { error: libError.message }
  if (!libItem) return { error: 'Failed to create library resource' }

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
    library_item_id: libItem.id,
    type: data.type,
    title: title || '',
    description: data.description ?? null,
    url: ensureUrl(data.url),
    file_path: data.type === 'file' ? null : (data.file_path ?? null),
    image_url: data.image_url ?? null,
    display_order: nextOrder,
    section_name: sectionName,
    metadata: data.metadata ?? {},
  }
  if (data.type === 'sponsor' && data.sponsor_account_id) {
    insertData.sponsor_account_id = data.sponsor_account_id
  }

  const { data: block, error } = await supabase
    .from('resource_blocks')
    .insert(insertData)
    .select('id')
    .single()

  if (error) {
    // Rollback: remove the library entry we just created
    await supabase.from('resource_library').delete().eq('id', libItem.id).eq('speaker_id', speakerId)
    return { error: error.message }
  }

  revalidatePath(`/dashboard/fanflets/${fanfletId}`)
  revalidatePath('/dashboard/resources')
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
    sponsor_account_id?: string | null
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
  if (data.sponsor_account_id !== undefined) updateData.sponsor_account_id = data.sponsor_account_id || null
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

  // If sponsor-type library item has a default sponsor, apply it when speaker still has active connection
  let sponsorAccountIdToLink: string | null = null
  if (libItem.type === 'sponsor' && libItem.default_sponsor_account_id && ownership.fanflet) {
    const { data: conn } = await supabase
      .from('sponsor_connections')
      .select('id')
      .eq('speaker_id', ownership.fanflet.speaker_id)
      .eq('sponsor_id', libItem.default_sponsor_account_id)
      .eq('status', 'active')
      .maybeSingle()
    if (conn) sponsorAccountIdToLink = libItem.default_sponsor_account_id
  }

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
    const insertPayload: Record<string, unknown> = {
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
    }
    if (sponsorAccountIdToLink) insertPayload.sponsor_account_id = sponsorAccountIdToLink

    const { data: block, error } = await supabase
      .from('resource_blocks')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/fanflets/${fanfletId}`)
    return { success: true, id: block.id }
  } else {
    // Dynamic link: store reference to library item.
    // For file-type resources, file_path is NOT copied — the download route
    // resolves it via the library_item_id join.
    const insertPayload: Record<string, unknown> = {
      fanflet_id: fanfletId,
      type: libItem.type,
      title: libItem.title,
      description: libItem.description,
      url: libItem.url,
      file_path: libItem.type === 'file' ? null : libItem.file_path,
      image_url: libItem.image_url,
      display_order: nextOrder,
      section_name: libItem.section_name,
      metadata: libItem.metadata ?? {},
      library_item_id: libraryItemId,
    }
    if (sponsorAccountIdToLink) insertPayload.sponsor_account_id = sponsorAccountIdToLink

    const { data: block, error } = await supabase
      .from('resource_blocks')
      .insert(insertPayload)
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
