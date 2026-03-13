import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { isbot } from 'isbot'
import { generateVisitorHash, getClientIp } from '@/lib/visitor-hash'
import { classifyReferrer } from '@/lib/referrer'

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

    const ip = getClientIp(request.headers)
    const ua = request.headers.get('user-agent') || 'unknown'
    const visitor_hash = await generateVisitorHash(ip, ua)

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

    const { error: insertError } = await supabase.from('analytics_events').insert({
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

    if (insertError) {
      console.error('[track] analytics insert failed:', insertError.code, insertError.message)
      return new NextResponse(null, { status: 500 })
    }

    const subscriberId = rawSubscriberId ?? null
    if (
      subscriberId &&
      (event_type === 'resource_click' || event_type === 'resource_download') &&
      resource_block_id
    ) {
      const { error: rpcError } = await supabase.rpc('record_sponsor_lead', {
        p_subscriber_id: subscriberId,
        p_resource_block_id: resource_block_id,
        p_engagement_type: event_type,
      })
      if (rpcError) {
        console.error('[track] record_sponsor_lead failed:', rpcError.code, rpcError.message)
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[track] unexpected error:', err)
    return new NextResponse(null, { status: 500 })
  }
}
