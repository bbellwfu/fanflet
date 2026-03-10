import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { isbot } from 'isbot'

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

function classifyReferrer(referrer: string | null, source: string | null): string {
  if (source === 'qr') return 'qr_code'
  if (source === 'portfolio') return 'portfolio'
  if (source === 'share') return 'share_link'
  if (!referrer) return 'direct'

  let hostname: string
  try {
    hostname = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'other'
  }

  if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\./.test(hostname)) return 'search'
  if (/linkedin\.|twitter\.|x\.com|facebook\.|instagram\.|threads\.net/.test(hostname)) return 'social'
  if (/mail\.|outlook\.|gmail\./.test(hostname)) return 'email'
  if (/slack\.|teams\.|discord\.|telegram\./.test(hostname)) return 'messaging'
  if (hostname.includes('fanflet.com')) return 'internal'

  return 'other'
}

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

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const dateStr = new Date().toISOString().split('T')[0]
    const hashInput = `${ip}-${ua}-${dateStr}`

    const encoder = new TextEncoder()
    const data = encoder.encode(hashInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const visitor_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
    const isTablet = /iPad|Tablet/i.test(ua)
    const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

    const referrer = request.headers.get('referer') || bodyReferrer || null
    const is_bot = isbot(ua)

    const country_code = request.headers.get('x-vercel-ip-country') || null
    const city = request.headers.get('x-vercel-ip-city') || null
    const region = request.headers.get('x-vercel-ip-country-region') || null

    const referrer_category = classifyReferrer(referrer, source ?? null)

    const supabase = await createClient()

    await supabase.from('analytics_events').insert({
      fanflet_id,
      event_type,
      resource_block_id: resource_block_id ?? null,
      visitor_hash,
      device_type,
      referrer,
      source: source ?? 'direct',
      is_bot,
      country_code,
      city,
      region,
      referrer_category,
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
    return new NextResponse(null, { status: 204 })
  }
}
