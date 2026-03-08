import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const VALID_EVENT_TYPES = [
  'page_view', 'resource_click', 'email_signup',
  'qr_scan', 'referral_click', 'resource_download', 'sms_bookmark',
] as const

const SOURCE_VALUES = ['direct', 'qr', 'portfolio', 'share'] as const

const TrackEventSchema = z.object({
  fanflet_id: z.string().uuid(),
  event_type: z.enum(VALID_EVENT_TYPES),
  resource_block_id: z.string().uuid().optional().nullable(),
  subscriber_id: z.string().uuid().optional().nullable(),
  referrer: z.string().max(2048).optional().nullable(),
  source: z.enum(SOURCE_VALUES).optional().default('direct'),
})

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 'track', 100, 60_000)
  if (rl.limited) return rl.response!

  try {
    const body = await request.json()
    const parsed = TrackEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { fanflet_id, event_type, resource_block_id, subscriber_id: rawSubscriberId, referrer: bodyReferrer, source } = parsed.data

    // Generate visitor hash from IP + User-Agent + date (daily uniqueness)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const dateStr = new Date().toISOString().split('T')[0]
    const hashInput = `${ip}-${ua}-${dateStr}`

    // Simple hash (using Web Crypto API)
    const encoder = new TextEncoder()
    const data = encoder.encode(hashInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const visitor_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Detect device type from User-Agent
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
    const isTablet = /iPad|Tablet/i.test(ua)
    const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

    const referrer = request.headers.get('referer') || bodyReferrer || null

    const supabase = await createClient()

    await supabase.from('analytics_events').insert({
      fanflet_id,
      event_type,
      resource_block_id: resource_block_id ?? null,
      visitor_hash,
      device_type,
      referrer,
      source: source ?? 'direct',
    })

    const subscriberId = rawSubscriberId ?? null
    if (
      subscriberId &&
      (event_type === 'resource_click' || event_type === 'resource_download') &&
      resource_block_id
    ) {
      void supabase.rpc('record_sponsor_lead', {
        p_subscriber_id: subscriberId,
        p_resource_block_id: resource_block_id,
        p_engagement_type: event_type,
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 }) // Fail silently for analytics
  }
}
