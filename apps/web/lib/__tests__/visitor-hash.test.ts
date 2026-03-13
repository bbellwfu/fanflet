import { describe, it, expect } from 'vitest'
import { generateVisitorHash, getClientIp } from '../visitor-hash'

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for (first value)', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(headers)).toBe('1.2.3.4')
  })

  it('trims whitespace from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '  10.0.0.1 , 10.0.0.2' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('falls back to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
    })
    expect(getClientIp(headers)).toBe('1.1.1.1')
  })

  it('returns "unknown" when no IP headers present', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('returns "unknown" for empty x-forwarded-for with no x-real-ip', () => {
    const headers = new Headers({ 'x-forwarded-for': '' })
    expect(getClientIp(headers)).toBe('unknown')
  })
})

describe('generateVisitorHash', () => {
  it('returns a 64-character hex string (SHA-256)', async () => {
    const hash = await generateVisitorHash('1.2.3.4', 'Mozilla/5.0')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same inputs on the same day', async () => {
    const a = await generateVisitorHash('1.2.3.4', 'Mozilla/5.0')
    const b = await generateVisitorHash('1.2.3.4', 'Mozilla/5.0')
    expect(a).toBe(b)
  })

  it('differs for different IPs', async () => {
    const a = await generateVisitorHash('1.2.3.4', 'Mozilla/5.0')
    const b = await generateVisitorHash('5.6.7.8', 'Mozilla/5.0')
    expect(a).not.toBe(b)
  })

  it('differs for different user agents', async () => {
    const a = await generateVisitorHash('1.2.3.4', 'Mozilla/5.0')
    const b = await generateVisitorHash('1.2.3.4', 'Chrome/100')
    expect(a).not.toBe(b)
  })
})
