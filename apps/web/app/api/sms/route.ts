import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const SmsBookmarkSchema = z.object({
  fanflet_id: z.string().uuid(),
  phone: z.string().min(10).max(20),
})

/** Strip a US/CA phone to digits-only E.164 format. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`
  return null
}

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
    const { data: fanflet } = await supabase
      .from('fanflets')
      .select('id, title, slug, speaker_id')
      .eq('id', fanflet_id)
      .eq('status', 'published')
      .single()

    if (!fanflet) {
      return NextResponse.json(
        { error: 'Fanflet not found.' },
        { status: 404 }
      )
    }

    // Get speaker slug for building the URL
    const { data: speaker } = await supabase
      .from('speakers')
      .select('slug')
      .eq('id', fanflet.speaker_id)
      .single()

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
    const { count } = await supabase
      .from('sms_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('phone_hash', phoneHash)
      .eq('fanflet_id', fanflet_id)
      .gte('created_at', oneDayAgo)

    if ((count ?? 0) >= 2) {
      return NextResponse.json(
        { error: 'A link was already sent to this number. Check your messages!' },
        { status: 429 }
      )
    }

    // Build the fanflet URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fanflet.com'
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
    await supabase.from('sms_bookmarks').insert({
      fanflet_id,
      phone_hash: phoneHash,
    })

    // Also track as analytics event
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const dateStr = new Date().toISOString().split('T')[0]
    const visitorHashInput = `${ip}-${ua}-${dateStr}`
    const visitorBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(visitorHashInput)
    )
    const visitorHash = Array.from(new Uint8Array(visitorBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    await supabase.from('analytics_events').insert({
      fanflet_id,
      event_type: 'sms_bookmark',
      visitor_hash: visitorHash,
      device_type: /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop',
    })

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
