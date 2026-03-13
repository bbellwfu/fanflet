import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Re-define schemas here since they're module-scoped in route files.
// This tests the Zod schema logic independently of the route handlers.

const SmsBookmarkSchema = z.object({
  fanflet_id: z.string().uuid(),
  phone: z.string().min(10).max(20),
})

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

const SurveyResponseSchema = z.object({
  fanflet_id: z.string().uuid(),
  question_id: z.string().uuid(),
  response_value: z.union([z.string(), z.number()]).transform(String),
})

const SubscribeSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  interest_tier: z.enum(['pro', 'enterprise']).optional(),
})

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('SmsBookmarkSchema', () => {
  it('accepts valid input', () => {
    const result = SmsBookmarkSchema.safeParse({ fanflet_id: VALID_UUID, phone: '5551234567' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID', () => {
    const result = SmsBookmarkSchema.safeParse({ fanflet_id: 'not-uuid', phone: '5551234567' })
    expect(result.success).toBe(false)
  })

  it('rejects phone shorter than 10 chars', () => {
    const result = SmsBookmarkSchema.safeParse({ fanflet_id: VALID_UUID, phone: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects phone longer than 20 chars', () => {
    const result = SmsBookmarkSchema.safeParse({ fanflet_id: VALID_UUID, phone: '1'.repeat(21) })
    expect(result.success).toBe(false)
  })

  it('rejects missing fanflet_id', () => {
    const result = SmsBookmarkSchema.safeParse({ phone: '5551234567' })
    expect(result.success).toBe(false)
  })
})

describe('TrackEventSchema', () => {
  it('accepts valid page_view event', () => {
    const result = TrackEventSchema.safeParse({
      fanflet_id: VALID_UUID,
      event_type: 'page_view',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.source).toBe('direct')
  })

  it('accepts event with all optional fields', () => {
    const result = TrackEventSchema.safeParse({
      fanflet_id: VALID_UUID,
      event_type: 'resource_click',
      resource_block_id: VALID_UUID,
      subscriber_id: VALID_UUID,
      referrer: 'https://google.com',
      source: 'qr',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid event_type', () => {
    const result = TrackEventSchema.safeParse({
      fanflet_id: VALID_UUID,
      event_type: 'invalid_event',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid source', () => {
    const result = TrackEventSchema.safeParse({
      fanflet_id: VALID_UUID,
      event_type: 'page_view',
      source: 'unknown_source',
    })
    expect(result.success).toBe(false)
  })

  it('accepts nullable optional fields as null', () => {
    const result = TrackEventSchema.safeParse({
      fanflet_id: VALID_UUID,
      event_type: 'page_view',
      resource_block_id: null,
      subscriber_id: null,
      referrer: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects referrer longer than 2048 chars', () => {
    const result = TrackEventSchema.safeParse({
      fanflet_id: VALID_UUID,
      event_type: 'page_view',
      referrer: 'https://example.com/' + 'a'.repeat(2048),
    })
    expect(result.success).toBe(false)
  })

  it('validates all event types', () => {
    for (const eventType of VALID_EVENT_TYPES) {
      const result = TrackEventSchema.safeParse({
        fanflet_id: VALID_UUID,
        event_type: eventType,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('SurveyResponseSchema', () => {
  it('accepts valid input with string response', () => {
    const result = SurveyResponseSchema.safeParse({
      fanflet_id: VALID_UUID,
      question_id: VALID_UUID,
      response_value: 'Very helpful',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.response_value).toBe('Very helpful')
  })

  it('accepts numeric response and transforms to string', () => {
    const result = SurveyResponseSchema.safeParse({
      fanflet_id: VALID_UUID,
      question_id: VALID_UUID,
      response_value: 5,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.response_value).toBe('5')
  })

  it('rejects invalid question_id', () => {
    const result = SurveyResponseSchema.safeParse({
      fanflet_id: VALID_UUID,
      question_id: 'bad-uuid',
      response_value: 'answer',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing response_value', () => {
    const result = SurveyResponseSchema.safeParse({
      fanflet_id: VALID_UUID,
      question_id: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })
})

describe('SubscribeSchema', () => {
  it('accepts valid email without interest_tier', () => {
    const result = SubscribeSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts valid email with pro tier', () => {
    const result = SubscribeSchema.safeParse({ email: 'user@example.com', interest_tier: 'pro' })
    expect(result.success).toBe(true)
  })

  it('accepts valid email with enterprise tier', () => {
    const result = SubscribeSchema.safeParse({ email: 'user@example.com', interest_tier: 'enterprise' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = SubscribeSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = SubscribeSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid interest_tier', () => {
    const result = SubscribeSchema.safeParse({ email: 'user@example.com', interest_tier: 'basic' })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = SubscribeSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
