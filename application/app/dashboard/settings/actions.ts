'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PhotoFrame } from '@/lib/photo-frame'

export async function updateSpeakerProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const bio = formData.get('bio') as string
  const slug = formData.get('slug') as string
  const photoUrl = formData.get('photo_url') as string | null
  const linkedin = formData.get('linkedin') as string
  const twitter = formData.get('twitter') as string
  const website = formData.get('website') as string

  // Validate slug uniqueness
  const { data: existing } = await supabase
    .from('speakers')
    .select('id')
    .eq('slug', slug)
    .neq('auth_user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { error: 'This URL slug is already taken' }
  }

  const { data: currentSpeaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const existingSocialLinks = currentSpeaker?.social_links
  const existingPhotoFrame =
    existingSocialLinks &&
    typeof existingSocialLinks === 'object' &&
    'photo_frame' in existingSocialLinks
      ? (existingSocialLinks as Record<string, unknown>).photo_frame
      : null

  const updateData: Record<string, unknown> = {
    name,
    bio,
    slug,
    social_links: {
      linkedin: linkedin || null,
      twitter: twitter || null,
      website: website || null,
      ...(existingPhotoFrame ? { photo_frame: existingPhotoFrame } : {}),
    },
  }

  if (photoUrl) {
    updateData.photo_url = photoUrl
  }

  const { error } = await supabase
    .from('speakers')
    .update(updateData)
    .eq('auth_user_id', user.id)

  if (error) {
    // Catch unique-constraint violation on slug and return a friendly message
    if (error.code === '23505' && error.message?.includes('slug')) {
      return { error: 'This URL slug is already taken. Please choose a different one.' }
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

  const existingSocialLinks =
    currentSpeaker?.social_links && typeof currentSpeaker.social_links === 'object'
      ? (currentSpeaker.social_links as Record<string, unknown>)
      : {}

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
