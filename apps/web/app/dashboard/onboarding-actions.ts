'use server'

import { revalidatePath } from 'next/cache'
import { requireSpeaker } from '@/lib/auth-context'
import { toSocialLinksRecord } from '@/lib/speaker-preferences'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

async function setChecklistDismissed(dismissed: boolean) {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()

  const { data: speaker } = await supabase
    .from('speakers')
    .select('social_links')
    .eq('id', speakerId)
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
    .eq('id', speakerId)

  if (error) return { error: error.message }

  await logImpersonationAction('mutation', '/dashboard', { action: 'setChecklistDismissed', speaker_id: speakerId, dismissed })
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
