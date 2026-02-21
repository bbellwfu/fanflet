'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSpeakerLimits, hasFeature } from '@fanflet/db'
import { DEFAULT_THEME_ID } from '@/lib/themes'
import { getStoredDefaultThemePreset } from '@/lib/speaker-preferences'
import { parseExpirationFromForm, resolveExpirationDate } from '@/lib/expiration'

export async function createFanflet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id, slug, social_links')
    .eq('auth_user_id', user.id)
    .single()

  if (!speaker) return { error: 'Speaker profile not found' }

  const limits = await getSpeakerLimits(speaker.id)
  const maxFanflets = limits?.max_fanflets
  if (typeof maxFanflets === 'number' && maxFanflets !== -1) {
    const { count, error: countError } = await supabase
      .from('fanflets')
      .select('id', { count: 'exact', head: true })
      .eq('speaker_id', speaker.id)
    if (countError) return { error: 'Could not check fanflet limit' }
    if ((count ?? 0) >= maxFanflets) {
      return {
        error: `You've reached the limit of ${maxFanflets} Fanflets for your plan. Upgrade your subscription to create more.`,
      }
    }
  }

  const title = formData.get('title') as string
  const event_name = formData.get('event_name') as string
  const event_date = formData.get('event_date') as string || null
  const slug = formData.get('slug') as string

  const { data: existing } = await supabase
    .from('fanflets')
    .select('id')
    .eq('speaker_id', speaker.id)
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return { error: 'You already have a Fanflet with this URL slug' }
  }

  const speakerDefaultTheme = getStoredDefaultThemePreset(speaker.social_links)
  const allowMultipleThemes = await hasFeature(speaker.id, 'multiple_theme_colors')
  const themeConfig =
    allowMultipleThemes && speakerDefaultTheme && speakerDefaultTheme !== DEFAULT_THEME_ID
      ? { preset: speakerDefaultTheme }
      : {}

  let expiration = parseExpirationFromForm(formData)
  const allowCustomExpiration = await hasFeature(speaker.id, 'custom_expiration')
  if (!allowCustomExpiration && expiration.preset !== 'none' && expiration.preset !== '14d') {
    expiration = { ...expiration, preset: '14d' as const, customDate: null }
  }

  const referenceDate = new Date()
  const expiration_date = resolveExpirationDate(expiration, referenceDate)

  const baseInsert: Record<string, unknown> = {
    speaker_id: speaker.id,
    title,
    event_name,
    event_date: event_date || null,
    slug,
    status: 'draft',
    theme_config: themeConfig,
  }

  let result = await supabase
    .from('fanflets')
    .insert({
      ...baseInsert,
      expiration_date: expiration_date ?? null,
      expiration_preset: expiration.preset,
      show_expiration_notice: expiration.showExpirationNotice,
    })
    .select('id')
    .single()

  if (result.error && (result.error.code === '42703' || result.error.code === 'PGRST204' || result.error.message?.includes('schema cache'))) {
    result = await supabase
      .from('fanflets')
      .insert(baseInsert)
      .select('id')
      .single()
  }

  if (result.error) return { error: result.error.message }
  const fanflet = result.data

  redirect(`/dashboard/fanflets/${fanflet.id}`)
}
