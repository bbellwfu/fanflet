'use server'

import { revalidatePath } from 'next/cache'
import { requireSpeaker } from '@/lib/auth-context'
import { blockImpersonationWrites, logImpersonationAction } from '@/lib/impersonation'
import {
  listSubscribers as coreListSubscribers,
  deleteSubscriber as coreDeleteSubscriber,
  deleteSubscribers as coreDeleteSubscribers,
} from '@fanflet/core'

export type SubscriberRow = {
  id: string
  email: string
  name: string | null
  created_at: string
  source_fanflet_id: string | null
  source_fanflet_title: string | null
}

export async function listSubscribers(): Promise<{
  data?: SubscriberRow[]
  error?: string
}> {
  const { supabase, speakerId } = await requireSpeaker()
  const result = await coreListSubscribers(supabase, speakerId)

  if (result.error) return { error: result.error.message }
  return { data: result.data }
}

export async function deleteSubscriber(
  subscriberId: string
): Promise<{ error?: string; success?: boolean }> {
  const impError = await blockImpersonationWrites()
  if (impError) return impError
  const { supabase, speakerId } = await requireSpeaker()

  const result = await coreDeleteSubscriber(supabase, speakerId, subscriberId)

  if (result.error) return { error: result.error.message }

  await logImpersonationAction('mutation', '/dashboard/subscribers', {
    action: 'deleteSubscriber',
    speaker_id: speakerId,
    subscriber_id: subscriberId,
  })
  revalidatePath('/dashboard/subscribers')
  return { success: true }
}

export async function deleteSubscribers(
  subscriberIds: string[]
): Promise<{ error?: string; success?: boolean; deletedCount?: number }> {
  const impError = await blockImpersonationWrites()
  if (impError) return impError
  const { supabase, speakerId } = await requireSpeaker()

  const result = await coreDeleteSubscribers(supabase, speakerId, subscriberIds)

  if (result.error) return { error: result.error.message }

  await logImpersonationAction('mutation', '/dashboard/subscribers', {
    action: 'deleteSubscribers',
    speaker_id: speakerId,
    subscriber_ids: subscriberIds,
    deleted_count: result.data?.deletedCount ?? 0,
  })
  revalidatePath('/dashboard/subscribers')
  return { success: true, deletedCount: result.data?.deletedCount ?? 0 }
}
