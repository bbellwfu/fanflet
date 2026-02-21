'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hasFeature } from '@fanflet/db'
import type { PhotoFrame } from '@/lib/photo-frame'
import { DEFAULT_THEME_ID, THEME_PRESETS } from '@/lib/themes'
import { toSocialLinksRecord } from '@/lib/speaker-preferences'
import { ensureUrl } from '@/lib/utils'

export async function updateSpeakerProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!speaker) return { error: 'Speaker profile not found' }

  const name = formData.get('name') as string
  const bio = formData.get('bio') as string
  const slug = formData.get('slug') as string
  const photoUrl = formData.get('photo_url') as string | null
  const removePhoto = formData.get('remove_photo') === 'true'
  const linkedin = formData.get('linkedin') as string
  const twitter = formData.get('twitter') as string
  const website = formData.get('website') as string
  const defaultThemePreset = formData.get('default_theme_preset') as string

  // Validate slug uniqueness
  const { data: existing } = await supabase
    .from('speakers')
    .select('id')
    .eq('slug', slug)
    .neq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { error: 'This public profile link is already taken' }
  }

  const { data: currentSpeaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const existingSocialLinks = toSocialLinksRecord(currentSpeaker?.social_links)
  const existingPhotoFrame =
    'photo_frame' in existingSocialLinks
      ? existingSocialLinks.photo_frame
      : null
  const validThemePresetIds = new Set(THEME_PRESETS.map((theme) => theme.id))
  const allowMultipleThemes = await hasFeature(speaker.id, 'multiple_theme_colors')
  const safeThemePreset =
    allowMultipleThemes && validThemePresetIds.has(defaultThemePreset)
      ? defaultThemePreset
      : DEFAULT_THEME_ID

  // Build social_links, preserving or clearing photo_frame based on remove flag
  const { photo_frame: _dropFrame, ...socialLinksWithoutFrame } = existingSocialLinks as Record<string, unknown>
  const socialLinks: Record<string, unknown> = {
    ...socialLinksWithoutFrame,
    linkedin: ensureUrl(linkedin),
    twitter: ensureUrl(twitter),
    website: ensureUrl(website),
    default_theme_preset: safeThemePreset,
  }
  if (!removePhoto && existingPhotoFrame) {
    socialLinks.photo_frame = existingPhotoFrame
  }

  const updateData: Record<string, unknown> = {
    name,
    bio,
    slug,
    social_links: socialLinks,
  }

  if (removePhoto) {
    updateData.photo_url = null
  } else if (photoUrl) {
    updateData.photo_url = photoUrl
  }

  const { error } = await supabase
    .from('speakers')
    .update(updateData)
    .eq('auth_user_id', user.id)

  if (error) {
    // Catch unique-constraint violation on slug and return a friendly message
    if (error.code === '23505' && error.message?.includes('slug')) {
      return { error: 'This public profile link is already taken. Please choose another one.' }
    }
    return { error: error.message }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function checkSlugAvailability(slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { available: false }

  if (!slug || !slug.trim()) return { available: false }

  const { data: existing } = await supabase
    .from('speakers')
    .select('id')
    .eq('slug', slug)
    .neq('auth_user_id', user.id)
    .maybeSingle()

  return { available: !existing }
}

export async function updateSpeakerPhoto(photoUrl: string, photoFrame?: PhotoFrame | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: currentSpeaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const existingSocialLinks = toSocialLinksRecord(currentSpeaker?.social_links)

  const { error } = await supabase
    .from('speakers')
    .update({
      photo_url: photoUrl,
      social_links: {
        ...existingSocialLinks,
        ...(photoFrame ? { photo_frame: photoFrame } : {}),
      },
    })
    .eq('auth_user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}
