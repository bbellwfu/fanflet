import { describe, it, expect } from 'vitest'
import { normalizePhone } from '@/lib/phone'

describe('normalizePhone', () => {
  it('normalizes 10-digit US number', () => {
    expect(normalizePhone('5551234567')).toBe('+15551234567')
  })

  it('normalizes 11-digit US number starting with 1', () => {
    expect(normalizePhone('15551234567')).toBe('+15551234567')
  })

  it('strips formatting characters', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567')
  })

  it('strips dots and spaces', () => {
    expect(normalizePhone('555.123.4567')).toBe('+15551234567')
  })

  it('handles +1 prefix', () => {
    expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567')
  })

  it('handles international number (UK)', () => {
    expect(normalizePhone('447911123456')).toBe('+447911123456')
  })

  it('handles 15-digit international number', () => {
    expect(normalizePhone('123456789012345')).toBe('+123456789012345')
  })

  it('returns null for too-short number (< 10 digits)', () => {
    expect(normalizePhone('12345')).toBeNull()
  })

  it('returns null for 9-digit number', () => {
    expect(normalizePhone('555123456')).toBeNull()
  })

  it('returns null for too-long number (> 15 digits)', () => {
    expect(normalizePhone('1234567890123456')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(normalizePhone('')).toBeNull()
  })

  it('returns null for letters only', () => {
    expect(normalizePhone('abcdefghij')).toBeNull()
  })
})
