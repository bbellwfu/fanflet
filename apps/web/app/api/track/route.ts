import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@fanflet/db/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fanflet_id, event_type, resource_block_id, subscriber_id: rawSubscriberId } = body

    if (!fanflet_id || !event_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Validate event_type
    const validTypes = ['page_view', 'resource_click', 'email_signup', 'qr_scan', 'referral_click', 'resource_download', 'sms_bookmark']
    if (!validTypes.includes(event_type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

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

    // Get referrer
    const referrer = request.headers.get('referer') || body.referrer || null

    const supabase = await createClient()

    await supabase.from('analytics_events').insert({
      fanflet_id,
      event_type,
      resource_block_id: resource_block_id || null,
      visitor_hash,
      device_type,
      referrer,
    })

    // Lead attribution: when a consented subscriber clicks a sponsor block, record sponsor_leads
    const subscriberId = typeof rawSubscriberId === 'string' && rawSubscriberId.trim() ? rawSubscriberId.trim() : null
    if (
      subscriberId &&
      (event_type === 'resource_click' || event_type === 'resource_download') &&
      resource_block_id
    ) {
      try {
        const service = createServiceClient()

        const { data: block } = await service
          .from('resource_blocks')
          .select('id, sponsor_account_id, title, fanflet_id')
          .eq('id', resource_block_id)
          .single()

        if (!block?.sponsor_account_id) {
          return new NextResponse(null, { status: 204 })
        }

        const { data: fanflet } = await service
          .from('fanflets')
          .select('speaker_id')
          .eq('id', block.fanflet_id)
          .single()

        if (!fanflet?.speaker_id) {
          return new NextResponse(null, { status: 204 })
        }

        const { data: connection } = await service
          .from('sponsor_connections')
          .select('id')
          .eq('speaker_id', fanflet.speaker_id)
          .eq('sponsor_id', block.sponsor_account_id)
          .eq('status', 'active')
          .is('ended_at', null)
          .maybeSingle()

        if (!connection) {
          return new NextResponse(null, { status: 204 })
        }

        const { data: subscriber } = await service
          .from('subscribers')
          .select('id, sponsor_consent')
          .eq('id', subscriberId)
          .single()

        if (subscriber?.sponsor_consent) {
          await service.from('sponsor_leads').insert({
            subscriber_id: subscriberId,
            sponsor_id: block.sponsor_account_id,
            fanflet_id: block.fanflet_id,
            resource_block_id: block.id,
            engagement_type: event_type,
            resource_title: block.title ?? null,
          })
        }
      } catch {
        // fail silently for lead attribution
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 }) // Fail silently for analytics
  }
}
