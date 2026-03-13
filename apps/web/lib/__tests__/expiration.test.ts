import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  EXPIRATION_PRESETS,
  FREE_TIER_EXPIRATION_PRESETS,
  computeExpirationDate,
  isExpired,
  getExpirationStatus,
  todayUtcDateOnly,
  parseExpirationFromForm,
  resolveExpirationDate,
} from '../expiration'

describe('EXPIRATION_PRESETS', () => {
  it('contains expected values', () => {
    expect(EXPIRATION_PRESETS).toEqual(['14d', '30d', '60d', '90d', 'none', 'custom'])
  })

  it('FREE_TIER_EXPIRATION_PRESETS is a subset', () => {
    for (const preset of FREE_TIER_EXPIRATION_PRESETS) {
      expect(EXPIRATION_PRESETS).toContain(preset)
    }
  })
})

describe('todayUtcDateOnly', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = todayUtcDateOnly()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('computeExpirationDate', () => {
  const ref = new Date('2026-03-01T12:00:00Z')

  it('returns null for "none" preset', () => {
    expect(computeExpirationDate('none', null, ref)).toBeNull()
  })

  it('computes 14d from reference date', () => {
    expect(computeExpirationDate('14d', null, ref)).toBe('2026-03-15')
  })

  it('computes 30d from reference date', () => {
    expect(computeExpirationDate('30d', null, ref)).toBe('2026-03-31')
  })

  it('computes 60d from reference date', () => {
    expect(computeExpirationDate('60d', null, ref)).toBe('2026-04-30')
  })

  it('computes 90d from reference date', () => {
    expect(computeExpirationDate('90d', null, ref)).toBe('2026-05-30')
  })

  it('returns custom date when preset is "custom"', () => {
    expect(computeExpirationDate('custom', '2026-06-15', ref)).toBe('2026-06-15')
  })

  it('returns null for custom with invalid date', () => {
    expect(computeExpirationDate('custom', 'not-a-date', ref)).toBeNull()
  })

  it('returns null for custom with null date', () => {
    expect(computeExpirationDate('custom', null, ref)).toBeNull()
  })

  it('returns null when reference date is null for day presets', () => {
    expect(computeExpirationDate('30d', null, null)).toBeNull()
  })

  it('handles month boundary correctly (Jan 31 + 30d)', () => {
    const jan31 = new Date('2026-01-31T12:00:00Z')
    expect(computeExpirationDate('30d', null, jan31)).toBe('2026-03-02')
  })
})

describe('isExpired', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false for null expiration date', () => {
    expect(isExpired(null)).toBe(false)
  })

  it('returns true for a past date', () => {
    expect(isExpired('2020-01-01')).toBe(true)
  })

  it('returns false for a far future date', () => {
    expect(isExpired('2099-12-31')).toBe(false)
  })

  it('returns false for today (end-of-day semantics)', () => {
    const today = todayUtcDateOnly()
    expect(isExpired(today)).toBe(false)
  })
})

describe('getExpirationStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null for null expiration date', () => {
    expect(getExpirationStatus(null)).toBeNull()
  })

  it('returns "expired" for a past date', () => {
    expect(getExpirationStatus('2020-01-01')).toBe('expired')
  })

  it('returns "active" for a date more than 7 days away', () => {
    const farFuture = '2099-12-31'
    expect(getExpirationStatus(farFuture)).toBe('active')
  })

  it('returns "expiring_soon" for a date within 7 days', () => {
    const now = new Date()
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const dateStr = inThreeDays.toISOString().split('T')[0]
    expect(getExpirationStatus(dateStr)).toBe('expiring_soon')
  })

  it('returns "expiring_soon" for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const dateStr = tomorrow.toISOString().split('T')[0]
    expect(getExpirationStatus(dateStr)).toBe('expiring_soon')
  })
})

describe('parseExpirationFromForm', () => {
  function makeFormData(entries: Record<string, string>): FormData {
    const fd = new FormData()
    for (const [k, v] of Object.entries(entries)) {
      fd.set(k, v)
    }
    return fd
  }

  it('parses a valid preset', () => {
    const result = parseExpirationFromForm(makeFormData({ expiration_preset: '30d' }))
    expect(result.preset).toBe('30d')
    expect(result.customDate).toBeNull()
    expect(result.showExpirationNotice).toBe(true)
  })

  it('defaults to "none" for invalid preset', () => {
    const result = parseExpirationFromForm(makeFormData({ expiration_preset: 'invalid' }))
    expect(result.preset).toBe('none')
  })

  it('defaults to "none" when preset is missing', () => {
    const result = parseExpirationFromForm(makeFormData({}))
    expect(result.preset).toBe('none')
  })

  it('parses custom date', () => {
    const result = parseExpirationFromForm(
      makeFormData({ expiration_preset: 'custom', expiration_custom_date: '2026-06-15' })
    )
    expect(result.preset).toBe('custom')
    expect(result.customDate).toBe('2026-06-15')
  })

  it('parses show_expiration_notice=false', () => {
    const result = parseExpirationFromForm(
      makeFormData({ show_expiration_notice: 'false' })
    )
    expect(result.showExpirationNotice).toBe(false)
  })
})

describe('resolveExpirationDate', () => {
  it('delegates to computeExpirationDate', () => {
    const parsed = { preset: '30d' as const, customDate: null, showExpirationNotice: true }
    const ref = new Date('2026-03-01T12:00:00Z')
    expect(resolveExpirationDate(parsed, ref)).toBe('2026-03-31')
  })
})
