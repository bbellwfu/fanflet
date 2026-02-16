'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toSocialLinksRecord } from '@/lib/speaker-preferences'

async function setChecklistDismissed(dismissed: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: speaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const currentSocialLinks = toSocialLinksRecord(speaker?.social_links)
  const onboarding = currentSocialLinks.onboarding && typeof currentSocialLinks.onboarding === 'object'
    ? (currentSocialLinks.onboarding as Record<string, unknown>)
    : {}

  const { error } = await supabase
    .from('speakers')
    .update({
      social_links: {
        ...currentSocialLinks,
        onboarding: {
          ...onboarding,
          dismissed,
          dismissed_at: dismissed ? new Date().toISOString() : null,
        },
      },
    })
    .eq('auth_user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function dismissOnboardingChecklist() {
  return setChecklistDismissed(true)
}

export async function resumeOnboardingChecklist() {
  return setChecklistDismissed(false)
}
