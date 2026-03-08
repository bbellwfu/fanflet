'use server'

import { requireSpeaker } from '@/lib/auth-context'
import { getSpeakerEntitlements } from '@fanflet/db'
import { cloneFanflet as coreCloneFanflet } from '@fanflet/core'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'

export async function cloneFanflet(
  sourceFanfletId: string
): Promise<{ error?: string; newFanfletId?: string }> {
  await blockImpersonationWrites()
  const { speakerId, supabase } = await requireSpeaker()
  const entitlements = await getSpeakerEntitlements(speakerId)

  const result = await coreCloneFanflet(supabase, speakerId, entitlements, sourceFanfletId)

  if (result.error) {
    return { error: result.error.message }
  }

  await logImpersonationAction('mutation', '/dashboard/fanflets', {
    action: 'cloneFanflet',
    source_fanflet_id: sourceFanfletId,
    new_fanflet_id: result.data!.id,
    speaker_id: speakerId,
  })

  return { newFanfletId: result.data!.id }
}
