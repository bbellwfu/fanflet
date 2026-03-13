import { describe, it, expect } from 'vitest'
import { rateLimit } from '../rate-limit'
import { NextRequest } from 'next/server'

function makeRequest(ip = '1.2.3.4'): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('rateLimit', () => {
  // Use a unique key per test to avoid cross-test pollution from the shared Map
  let keyIndex = 0
  function uniqueKey() {
    return `test-${keyIndex++}-${Date.now()}`
  }

  it('allows first request', () => {
    const result = rateLimit(makeRequest(), uniqueKey(), 5, 60_000)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(4)
    expect(result.response).toBeUndefined()
  })

  it('decrements remaining on each call', () => {
    const key = uniqueKey()
    const r1 = rateLimit(makeRequest(), key, 5, 60_000)
    expect(r1.remaining).toBe(4)

    const r2 = rateLimit(makeRequest(), key, 5, 60_000)
    expect(r2.remaining).toBe(3)

    const r3 = rateLimit(makeRequest(), key, 5, 60_000)
    expect(r3.remaining).toBe(2)
  })

  it('returns limited=true when limit exceeded', () => {
    const key = uniqueKey()
    for (let i = 0; i < 3; i++) {
      rateLimit(makeRequest(), key, 3, 60_000)
    }
    const result = rateLimit(makeRequest(), key, 3, 60_000)
    expect(result.limited).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.response).toBeDefined()
  })

  it('returns 429 status in response', async () => {
    const key = uniqueKey()
    for (let i = 0; i < 2; i++) {
      rateLimit(makeRequest(), key, 2, 60_000)
    }
    const result = rateLimit(makeRequest(), key, 2, 60_000)
    expect(result.response!.status).toBe(429)
    const body = await result.response!.json()
    expect(body.error).toBe('Too many requests')
  })

  it('includes Retry-After header', () => {
    const key = uniqueKey()
    rateLimit(makeRequest(), key, 1, 60_000)
    const result = rateLimit(makeRequest(), key, 1, 60_000)
    const retryAfter = result.response!.headers.get('Retry-After')
    expect(retryAfter).toBeDefined()
    expect(Number(retryAfter)).toBeGreaterThan(0)
    expect(Number(retryAfter)).toBeLessThanOrEqual(60)
  })

  it('tracks different IPs independently', () => {
    const key = uniqueKey()
    rateLimit(makeRequest('10.0.0.1'), key, 1, 60_000)
    const result = rateLimit(makeRequest('10.0.0.2'), key, 1, 60_000)
    expect(result.limited).toBe(false)
  })

  it('tracks different keys independently', () => {
    const key1 = uniqueKey()
    const key2 = uniqueKey()
    rateLimit(makeRequest(), key1, 1, 60_000)
    const result = rateLimit(makeRequest(), key2, 1, 60_000)
    expect(result.limited).toBe(false)
  })

  it('allows exactly limit number of requests', () => {
    const key = uniqueKey()
    for (let i = 0; i < 5; i++) {
      const r = rateLimit(makeRequest(), key, 5, 60_000)
      expect(r.limited).toBe(false)
    }
    const r6 = rateLimit(makeRequest(), key, 5, 60_000)
    expect(r6.limited).toBe(true)
  })

  it('uses x-real-ip when x-forwarded-for is missing', () => {
    const key = uniqueKey()
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '192.168.1.1' },
    })
    const result = rateLimit(req, key, 5, 60_000)
    expect(result.limited).toBe(false)
  })

  it('falls back to "unknown" when no IP headers', () => {
    const key = uniqueKey()
    const req = new NextRequest('http://localhost/api/test')
    const result = rateLimit(req, key, 5, 60_000)
    expect(result.limited).toBe(false)
  })
})
