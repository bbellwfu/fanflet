import { describe, it, expect, vi, afterEach } from 'vitest'
import { getSiteUrl } from '../config'

describe('getSiteUrl', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('returns NEXT_PUBLIC_SITE_URL when set', () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_SITE_URL: 'https://fanflet.com' }
    expect(getSiteUrl()).toBe('https://fanflet.com')
  })

  it('returns localhost fallback in development when URL not set', () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_SITE_URL: '', NODE_ENV: 'development' }
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('returns localhost when NEXT_PUBLIC_SITE_URL is undefined in development', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' }
    delete process.env.NEXT_PUBLIC_SITE_URL
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('throws in production when URL not set', () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_SITE_URL: '', NODE_ENV: 'production' }
    expect(() => getSiteUrl()).toThrow('NEXT_PUBLIC_SITE_URL is not set')
  })
})
