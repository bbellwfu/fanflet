import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

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
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'
    const dateStr = new Date().toISOString().split('T')[0]
    const hashInput = `${ip}-${ua}-${dateStr}`

    const encoder = new TextEncoder()
    const data = encoder.encode(hashInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const visitor_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const supabase = await createClient()

    // Check for duplicate submission (same visitor + fanflet + question)
    const { data: existing } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('fanflet_id', fanflet_id)
      .eq('question_id', question_id)
      .eq('visitor_hash', visitor_hash)
      .maybeSingle()

    if (existing) {
      // Already submitted — silently succeed
      return new NextResponse(null, { status: 204 })
    }

    await supabase.from('survey_responses').insert({
      fanflet_id,
      question_id,
      response_value: String(response_value),
      visitor_hash,
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 }) // Fail silently
  }
}
