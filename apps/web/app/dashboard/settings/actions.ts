'use server'

import { revalidatePath } from 'next/cache'
import { requireSpeaker } from '@/lib/auth-context'
import { getSpeakerEntitlements } from '@fanflet/db'
import type { PhotoFrame } from '@/lib/photo-frame'
import { DEFAULT_THEME_ID, THEME_PRESETS } from '@/lib/themes'
import { toSocialLinksRecord } from '@/lib/speaker-preferences'
import { ensureUrl } from '@/lib/utils'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

export async function updateSpeakerProfile(formData: FormData) {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

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
    .neq('id', speakerId)
    .maybeSingle()

  if (existing) {
    return { error: 'This public profile link is already taken' }
  }

  const { data: currentSpeaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('id', speakerId)
    .maybeSingle()

  const existingSocialLinks = toSocialLinksRecord(currentSpeaker?.social_links)
  const existingPhotoFrame =
    'photo_frame' in existingSocialLinks
      ? existingSocialLinks.photo_frame
      : null
  const validThemePresetIds = new Set(THEME_PRESETS.map((theme) => theme.id))
  const allowMultipleThemes = (await getSpeakerEntitlements(speakerId)).features.has('multiple_theme_colors')
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
    .eq('id', speakerId)

  if (error) {
    // Catch unique-constraint violation on slug and return a friendly message
    if (error.code === '23505' && error.message?.includes('slug')) {
      return { error: 'This public profile link is already taken. Please choose another one.' }
    }
    return { error: error.message }
  }

  await logImpersonationAction('mutation', '/dashboard/settings', { action: 'updateSpeakerProfile', speaker_id: speakerId })
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function checkSlugAvailability(slug: string) {
  const { speakerId, supabase } = await requireSpeaker()

  if (!slug || !slug.trim()) return { available: false }

  const { data: existing } = await supabase
    .from('speakers')
    .select('id')
    .eq('slug', slug)
    .neq('id', speakerId)
    .maybeSingle()

  return { available: !existing }
}

export async function removeSpeakerPhoto() {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  const { data: currentSpeaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('id', speakerId)
    .maybeSingle()

  const existingSocialLinks = toSocialLinksRecord(currentSpeaker?.social_links ?? {})
  const { photo_frame: _drop, ...socialLinksWithoutFrame } = existingSocialLinks as Record<string, unknown>

  const { error } = await supabase
    .from('speakers')
    .update({
      photo_url: null,
      social_links: socialLinksWithoutFrame,
    })
    .eq('id', speakerId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/settings', { action: 'removeSpeakerPhoto', speaker_id: speakerId })
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateSpeakerPhoto(photoUrl: string, photoFrame?: PhotoFrame | null) {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  const { data: currentSpeaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('id', speakerId)
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
    .eq('id', speakerId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard/settings', { action: 'updateSpeakerPhoto', speaker_id: speakerId })
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}
