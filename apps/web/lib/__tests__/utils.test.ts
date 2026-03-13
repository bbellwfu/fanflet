import { describe, it, expect } from 'vitest'
import { cn, ensureUrl } from '../utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates tailwind classes via twMerge', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('returns empty string for no args', () => {
    expect(cn()).toBe('')
  })
})

describe('ensureUrl', () => {
  it('returns null for null', () => {
    expect(ensureUrl(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(ensureUrl(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(ensureUrl('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(ensureUrl('   ')).toBeNull()
  })

  it('leaves https:// URLs as-is', () => {
    expect(ensureUrl('https://example.com')).toBe('https://example.com')
  })

  it('leaves http:// URLs as-is', () => {
    expect(ensureUrl('http://example.com')).toBe('http://example.com')
  })

  it('leaves HTTP:// (uppercase) as-is', () => {
    expect(ensureUrl('HTTP://example.com')).toBe('HTTP://example.com')
  })

  it('prepends https:// for bare domains', () => {
    expect(ensureUrl('example.com')).toBe('https://example.com')
  })

  it('prepends https:// for www domains', () => {
    expect(ensureUrl('www.example.com')).toBe('https://www.example.com')
  })

  it('trims whitespace', () => {
    expect(ensureUrl('  example.com  ')).toBe('https://example.com')
  })

  it('leaves mailto: as-is', () => {
    expect(ensureUrl('mailto:user@example.com')).toBe('mailto:user@example.com')
  })

  it('leaves ftp: as-is', () => {
    expect(ensureUrl('ftp://files.example.com')).toBe('ftp://files.example.com')
  })
})
