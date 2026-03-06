'use server'

import { requireSpeaker } from '@/lib/auth-context'
import { getSpeakerEntitlements } from '@fanflet/db'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

export async function cloneFanflet(
  sourceFanfletId: string
): Promise<{ error?: string; newFanfletId?: string }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  const entitlements = await getSpeakerEntitlements(speakerId)
  const maxFanflets = entitlements.limits.max_fanflets
  if (typeof maxFanflets === 'number' && maxFanflets !== -1) {
    const { count, error: countError } = await supabase
      .from('fanflets')
      .select('id', { count: 'exact', head: true })
      .eq('speaker_id', speakerId)
    if (countError) return { error: 'Could not check fanflet limit' }
    if ((count ?? 0) >= maxFanflets) {
      return {
        error: `You've reached the limit of ${maxFanflets} Fanflets for your plan. Upgrade your subscription to create more.`,
      }
    }
  }

  const { data: source, error: sourceError } = await supabase
    .from('fanflets')
    .select('id, speaker_id, title, description, event_name, event_date, slug, theme_config, survey_question_id, expiration_date, expiration_preset, show_expiration_notice')
    .eq('id', sourceFanfletId)
    .eq('speaker_id', speakerId)
    .single()

  if (sourceError || !source) {
    return { error: 'Fanflet not found or you do not have permission to clone it.' }
  }

  let candidateSlug = `${source.slug}-copy`
  let suffix = 2
  while (true) {
    const { data: existing } = await supabase
      .from('fanflets')
      .select('id')
      .eq('speaker_id', speakerId)
      .eq('slug', candidateSlug)
      .maybeSingle()
    if (!existing) break
    candidateSlug = `${source.slug}-copy-${suffix}`
    suffix += 1
  }

  const { data: newFanflet, error: insertError } = await supabase
    .from('fanflets')
    .insert({
      speaker_id: speakerId,
      title: `${source.title} (Copy)`,
      description: source.description,
      event_name: source.event_name,
      event_date: source.event_date,
      slug: candidateSlug,
      status: 'draft',
      published_at: null,
      theme_config: source.theme_config,
      survey_question_id: source.survey_question_id,
      expiration_date: source.expiration_date,
      expiration_preset: source.expiration_preset,
      show_expiration_notice: source.show_expiration_notice,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }
  if (!newFanflet) return { error: 'Failed to create cloned fanflet.' }

  const { data: blocks, error: blocksError } = await supabase
    .from('resource_blocks')
    .select('library_item_id, type, title, description, url, file_path, image_url, display_order, section_name, metadata')
    .eq('fanflet_id', sourceFanfletId)
    .order('display_order', { ascending: true })

  if (blocksError) {
    return { error: 'Could not load resource blocks to copy.' }
  }

  if (blocks && blocks.length > 0) {
    const inserts = blocks.map((b) => ({
      fanflet_id: newFanflet.id,
      library_item_id: b.library_item_id,
      type: b.type,
      title: b.title ?? '',
      description: b.description ?? null,
      url: b.url ?? null,
      file_path: b.file_path ?? null,
      image_url: b.image_url ?? null,
      display_order: b.display_order,
      section_name: b.section_name ?? null,
      metadata: b.metadata ?? {},
    }))
    const { error: blocksInsertError } = await supabase
      .from('resource_blocks')
      .insert(inserts)
    if (blocksInsertError) {
      return { error: 'Could not copy resource blocks.' }
    }
  }

  await logImpersonationAction('mutation', '/dashboard/fanflets', { action: 'cloneFanflet', source_fanflet_id: sourceFanfletId, new_fanflet_id: newFanflet.id, speaker_id: speakerId })
  return { newFanfletId: newFanflet.id }
}
