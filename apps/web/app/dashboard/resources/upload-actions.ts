'use server'

import { createClient } from '@/lib/supabase/server'
import { getSpeakerEntitlements } from '@fanflet/db'
import {
  STORAGE_BUCKET,
  isAllowedFileType,
  getStorageQuota,
  buildStoragePath,
  ALLOWED_EXTENSIONS,
} from '@fanflet/db/storage'
import { revalidatePath } from 'next/cache'

async function getSpeakerContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: speaker } = await supabase
    .from('speakers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!speaker) return null
  return { supabase, user, speakerId: speaker.id }
}

export type UploadSlotResult = {
  allowed: true
  path: string
  libraryItemId: string
  speakerId: string
} | {
  allowed: false
  error: string
}

/**
 * Pre-validates a file upload before the client sends it to Supabase Storage.
 * Checks: auth, file_upload entitlement, file type allowlist, per-file size limit, total storage quota.
 * On success, creates a placeholder resource_library row and returns the storage path.
 */
export async function requestUploadSlot(params: {
  fileName: string
  fileSize: number
  fileType: string
  title?: string
  description?: string
  sectionName?: string
}): Promise<UploadSlotResult> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { allowed: false, error: 'Not authenticated' }

  const { supabase, speakerId } = ctx
  const entitlements = await getSpeakerEntitlements(speakerId)
  const quota = getStorageQuota(entitlements.limits)

  if (!isAllowedFileType(params.fileName)) {
    return {
      allowed: false,
      error: `File type not supported. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  if (params.fileSize > quota.maxFileBytes) {
    return {
      allowed: false,
      error: `File too large (max ${quota.maxFileMb} MB for your plan)`,
    }
  }

  const { data: usageRow } = await supabase.rpc('speaker_storage_used_bytes', {
    p_speaker_id: speakerId,
  })
  const currentUsage = typeof usageRow === 'number' ? usageRow : 0

  if (currentUsage + params.fileSize > quota.storageBytes) {
    return {
      allowed: false,
      error: `Not enough storage. You're using ${Math.round(currentUsage / 1024 / 1024)} MB of ${quota.storageMb} MB`,
    }
  }

  const { data: libItem, error: insertError } = await supabase
    .from('resource_library')
    .insert({
      speaker_id: speakerId,
      type: 'file',
      title: params.title?.trim() || params.fileName,
      description: params.description ?? null,
      section_name: params.sectionName ?? 'Resources',
      metadata: {},
    })
    .select('id')
    .single()

  if (insertError || !libItem) {
    return { allowed: false, error: insertError?.message ?? 'Failed to create library entry' }
  }

  const storagePath = buildStoragePath(speakerId, libItem.id, params.fileName)

  return {
    allowed: true,
    path: storagePath,
    libraryItemId: libItem.id,
    speakerId,
  }
}

/**
 * Called after a successful client-side upload to finalize the resource_library record
 * with the actual file metadata (path, size, type).
 */
export async function confirmUpload(params: {
  libraryItemId: string
  filePath: string
  fileSizeBytes: number
  fileType: string
  title?: string
}): Promise<{ error?: string; success?: boolean }> {
  const ctx = await getSpeakerContext()
  if (!ctx) return { error: 'Not authenticated' }

  const { supabase, speakerId } = ctx

  const updateData: Record<string, unknown> = {
    file_path: params.filePath,
    file_size_bytes: params.fileSizeBytes,
    file_type: params.fileType,
    updated_at: new Date().toISOString(),
  }
  if (params.title) {
    updateData.title = params.title.trim()
  }

  const { error } = await supabase
    .from('resource_library')
    .update(updateData)
    .eq('id', params.libraryItemId)
    .eq('speaker_id', speakerId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/resources')
  return { success: true }
}

/**
 * Cancels an upload slot — removes the placeholder library entry.
 * Called if the client-side upload fails and we need to clean up.
 */
export async function cancelUploadSlot(libraryItemId: string): Promise<void> {
  const ctx = await getSpeakerContext()
  if (!ctx) return

  await ctx.supabase
    .from('resource_library')
    .delete()
    .eq('id', libraryItemId)
    .eq('speaker_id', ctx.speakerId)
    .is('file_path', null)
}
