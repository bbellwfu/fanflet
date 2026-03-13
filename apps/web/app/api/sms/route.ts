import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { generateVisitorHash, getClientIp } from '@/lib/visitor-hash'
import { getSiteUrl } from '@/lib/config'
import { normalizePhone } from '@/lib/phone'

const SmsBookmarkSchema = z.object({
  fanflet_id: z.string().uuid(),
  phone: z.string().min(10).max(20),
})

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 'sms', 5, 60_000)
  if (rl.limited) return rl.response!

  try {
    const body = await request.json()
    const parsed = SmsBookmarkSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number.' },
        { status: 400 }
      )
    }

    const { fanflet_id, phone } = parsed.data
    const normalized = normalizePhone(phone)

    if (!normalized) {
      return NextResponse.json(
        { error: 'Please enter a valid US phone number.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the fanflet exists and is published
    const { data: fanflet, error: fanfletError } = await supabase
      .from('fanflets')
      .select('id, title, slug, speaker_id')
      .eq('id', fanflet_id)
      .eq('status', 'published')
      .single()

    if (fanfletError || !fanflet) {
      if (fanfletError && fanfletError.code !== 'PGRST116') {
        console.error('[sms] fanflet lookup failed:', fanfletError.code, fanfletError.message)
      }
      return NextResponse.json(
        { error: 'Fanflet not found.' },
        { status: 404 }
      )
    }

    // Get speaker slug for building the URL
    const { data: speaker, error: speakerError } = await supabase
      .from('speakers')
      .select('slug')
      .eq('id', fanflet.speaker_id)
      .single()

    if (speakerError) {
      console.error('[sms] speaker lookup failed:', speakerError.code, speakerError.message)
    }

    // Hash the phone number for privacy-preserving rate limiting
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(normalized)
    )
    const phoneHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Rate limit: max 2 SMS per phone+fanflet per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await supabase
      .from('sms_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('phone_hash', phoneHash)
      .eq('fanflet_id', fanflet_id)
      .gte('created_at', oneDayAgo)

    if (countError) {
      console.error('[sms] rate limit check failed:', countError.code, countError.message)
    }

    if ((count ?? 0) >= 2) {
      return NextResponse.json(
        { error: 'A link was already sent to this number. Check your messages!' },
        { status: 429 }
      )
    }

    // Build the fanflet URL
    const siteUrl = getSiteUrl()
    const speakerSlug = speaker?.slug
    const fanfletUrl = `${siteUrl}/${speakerSlug}/${fanflet.slug}`

    // Send SMS via Twilio (if configured)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER

    if (twilioSid && twilioToken && twilioFrom) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`

      const twilioBody = new URLSearchParams({
        To: normalized,
        From: twilioFrom,
        Body: `Here's the link you bookmarked: ${fanflet.title}\n\n${fanfletUrl}\n\nSent via Fanflet`,
      })

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: twilioBody.toString(),
      })

      if (!twilioResponse.ok) {
        return NextResponse.json(
          { error: 'Unable to send text right now. Please try again.' },
          { status: 500 }
        )
      }
    }

    // Record the bookmark (even if Twilio not configured — for analytics)
    const { error: bookmarkError } = await supabase.from('sms_bookmarks').insert({
      fanflet_id,
      phone_hash: phoneHash,
    })
    if (bookmarkError) {
      console.error('[sms] bookmark insert failed:', bookmarkError.code, bookmarkError.message)
    }

    // Also track as analytics event
    const ip = getClientIp(request.headers)
    const ua = request.headers.get('user-agent') || 'unknown'
    const visitorHash = await generateVisitorHash(ip, ua)

    const { error: analyticsError } = await supabase.from('analytics_events').insert({
      fanflet_id,
      event_type: 'sms_bookmark',
      visitor_hash: visitorHash,
      device_type: /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop',
    })
    if (analyticsError) {
      console.error('[sms] analytics insert failed:', analyticsError.code, analyticsError.message)
    }

    const configured = Boolean(twilioSid && twilioToken && twilioFrom)

    return NextResponse.json({
      success: true,
      sent: configured,
      message: configured
        ? 'Link sent! Check your text messages.'
        : 'Bookmark saved! SMS delivery will be available soon.',
    })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
