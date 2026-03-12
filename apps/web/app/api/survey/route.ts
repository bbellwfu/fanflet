import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
import { generateVisitorHash, getClientIp } from '@/lib/visitor-hash'

const SurveyResponseSchema = z.object({
  fanflet_id: z.string().uuid(),
  question_id: z.string().uuid(),
  response_value: z.union([z.string(), z.number()]).transform(String),
})

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 'survey', 20, 60_000)
  if (rl.limited) return rl.response!

  try {
    const body = await request.json()
    const parsed = SurveyResponseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { fanflet_id, question_id, response_value } = parsed.data

    // Generate visitor hash from IP + User-Agent + date (daily uniqueness)
    const ip = getClientIp(request.headers)
    const ua = request.headers.get('user-agent') || 'unknown'
    const visitor_hash = await generateVisitorHash(ip, ua)

    const supabase = await createClient()

    // Check for duplicate submission (same visitor + fanflet + question)
    const { data: existing, error: lookupError } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('fanflet_id', fanflet_id)
      .eq('question_id', question_id)
      .eq('visitor_hash', visitor_hash)
      .maybeSingle()

    if (lookupError) {
      console.error('[survey] duplicate check failed:', lookupError.code, lookupError.message)
    }

    if (existing) {
      // Already submitted — silently succeed
      return new NextResponse(null, { status: 204 })
    }

    const { error: insertError } = await supabase.from('survey_responses').insert({
      fanflet_id,
      question_id,
      response_value: String(response_value),
      visitor_hash,
    })

    if (insertError) {
      console.error('[survey] insert failed:', insertError.code, insertError.message)
      return new NextResponse(null, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[survey] unexpected error:', err)
    return new NextResponse(null, { status: 500 })
  }
}
