'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_THEME_ID } from '@/lib/themes'
import { getStoredDefaultThemePreset } from '@/lib/speaker-preferences'

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
  const themeConfig =
    speakerDefaultTheme && speakerDefaultTheme !== DEFAULT_THEME_ID
      ? { preset: speakerDefaultTheme }
      : {}

  const { data: fanflet, error } = await supabase
    .from('fanflets')
    .insert({
      speaker_id: speaker.id,
      title,
      event_name,
      event_date: event_date || null,
      slug,
      status: 'draft',
      theme_config: themeConfig,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  redirect(`/dashboard/fanflets/${fanflet.id}`)
}
