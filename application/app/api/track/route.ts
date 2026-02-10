import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fanflet_id, event_type, resource_block_id } = body

    if (!fanflet_id || !event_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Validate event_type
    const validTypes = ['page_view', 'resource_click', 'email_signup', 'qr_scan']
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

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 }) // Fail silently for analytics
  }
}
