import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@fanflet/db/service'
import { STORAGE_BUCKET, extractFilename, getStorageQuota } from '@fanflet/db/storage'
import { rateLimit } from '@/lib/rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface DownloadRow {
  id: string
  file_path: string | null
  library_item_id: string | null
  fanflet_id: string
  fanflets: {
    status: string
    slug: string
    expiration_date: string | null
    speaker_id: string
    speakers: {
      slug: string
    }
  }
  resource_library: {
    file_path: string | null
  } | null
}

/**
 * Scoped download route — mediates access to private files.
 * Checks fanflet ownership, published status, and expiration before
 * generating a short-lived Supabase signed URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fanfletId: string; resourceBlockId: string }> }
) {
  const rl = rateLimit(request, 'download', 30, 60_000)
  if (rl.limited) return rl.response!

  const { fanfletId, resourceBlockId } = await params

  if (!UUID_RE.test(fanfletId) || !UUID_RE.test(resourceBlockId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Use the anon client for the data query -- RLS allows reading published fanflets
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('resource_blocks')
    .select(`
      id, file_path, library_item_id, fanflet_id,
      fanflets!inner ( status, slug, expiration_date, speaker_id, speakers!inner ( slug ) ),
      resource_library ( file_path )
    `)
    .eq('id', resourceBlockId)
    .eq('fanflet_id', fanfletId)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Handle potential array from join
  const rawLib = (row as any).resource_library
  const lib = Array.isArray(rawLib) ? rawLib[0] : rawLib
  const typedRow = {
    ...row,
    resource_library: lib
  } as unknown as DownloadRow
  const fanflet = typedRow.fanflets
  const speakerSlug = fanflet.speakers.slug
  const fanfletSlug = fanflet.slug
  const fanfletPagePath = fanfletSlug ? `/${speakerSlug}/${fanfletSlug}` : `/${speakerSlug}`

  if (fanflet.status !== 'published') {
    return NextResponse.redirect(new URL(fanfletPagePath, request.url), 302)
  }

  if (fanflet.expiration_date) {
    const expiry = new Date(fanflet.expiration_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (expiry < today) {
      const expiredUrl = new URL(fanfletPagePath, request.url)
      expiredUrl.searchParams.set('expired_download', '1')
      return NextResponse.redirect(expiredUrl, 302)
    }
  }

  const filePath = typedRow.resource_library?.file_path ?? typedRow.file_path
  if (!filePath) {
    return NextResponse.json({ error: 'file_not_found' }, { status: 404 })
  }

  // Service client required for: (1) plan lookup (speaker_subscriptions has auth-only SELECT)
  // and (2) generating signed URLs for private storage
  let serviceClient: ReturnType<typeof createServiceClient>
  try {
    serviceClient = createServiceClient()
  } catch {
    console.error('[download] SUPABASE_SERVICE_ROLE_KEY is not configured — file downloads unavailable')
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  let signedUrlSeconds = 15 * 60
  const { data: sub } = await serviceClient
    .from('speaker_subscriptions')
    .select('plans ( limits )')
    .eq('speaker_id', fanflet.speaker_id)
    .eq('status', 'active')
    .maybeSingle()

  if (sub) {
    const plan = (sub as unknown as { plans: { limits: Record<string, number> } | null }).plans
    if (plan?.limits) {
      const quota = getStorageQuota(plan.limits)
      signedUrlSeconds = quota.signedUrlMinutes * 60
    }
  }

  const originalFilename = extractFilename(filePath)
  const { data: signed, error: signError } = await serviceClient.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, signedUrlSeconds, {
      download: originalFilename,
    })

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'file_not_found' }, { status: 404 })
  }

  // Fire-and-forget analytics logging
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  const ua = request.headers.get('user-agent') ?? 'unknown'
  const dateStr = new Date().toISOString().split('T')[0]
  const hashInput = `${ip}-${ua}-${dateStr}`
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput))
  const visitorHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  const isTablet = /iPad|Tablet/i.test(ua)
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  void supabase.from('analytics_events').insert({  // anon client; RLS allows public INSERT for published fanflets
    fanflet_id: fanfletId,
    event_type: 'resource_download',
    resource_block_id: resourceBlockId,
    visitor_hash: visitorHash,
    device_type: deviceType,
    referrer: request.headers.get('referer') ?? null,
  })

  return NextResponse.redirect(signed.signedUrl, 302)
}
