import { describe, it, expect } from 'vitest'
import { classifyReferrer } from '@/lib/referrer'

describe('classifyReferrer', () => {
  // Source-based classification
  it('returns "qr_code" when source is "qr"', () => {
    expect(classifyReferrer('https://google.com', 'qr')).toBe('qr_code')
  })

  it('returns "portfolio" when source is "portfolio"', () => {
    expect(classifyReferrer(null, 'portfolio')).toBe('portfolio')
  })

  it('returns "share_link" when source is "share"', () => {
    expect(classifyReferrer(null, 'share')).toBe('share_link')
  })

  // Direct
  it('returns "direct" when no referrer and no special source', () => {
    expect(classifyReferrer(null, null)).toBe('direct')
  })

  it('returns "direct" when no referrer and source is "direct"', () => {
    expect(classifyReferrer(null, 'direct')).toBe('direct')
  })

  // Search engines
  it('classifies Google as "search"', () => {
    expect(classifyReferrer('https://www.google.com/search?q=test', null)).toBe('search')
  })

  it('classifies Bing as "search"', () => {
    expect(classifyReferrer('https://www.bing.com/search?q=test', null)).toBe('search')
  })

  it('classifies DuckDuckGo as "search"', () => {
    expect(classifyReferrer('https://duckduckgo.com/?q=test', null)).toBe('search')
  })

  it('classifies Yahoo as "search"', () => {
    expect(classifyReferrer('https://search.yahoo.com/search', null)).toBe('search')
  })

  it('classifies Baidu as "search"', () => {
    expect(classifyReferrer('https://www.baidu.com/s?wd=test', null)).toBe('search')
  })

  it('classifies Yandex as "search"', () => {
    expect(classifyReferrer('https://yandex.com/search?text=test', null)).toBe('search')
  })

  // Social
  it('classifies LinkedIn as "social"', () => {
    expect(classifyReferrer('https://www.linkedin.com/feed', null)).toBe('social')
  })

  it('classifies Twitter as "social"', () => {
    expect(classifyReferrer('https://twitter.com/user', null)).toBe('social')
  })

  it('classifies X.com as "social"', () => {
    expect(classifyReferrer('https://x.com/user/status/123', null)).toBe('social')
  })

  it('classifies Facebook as "social"', () => {
    expect(classifyReferrer('https://www.facebook.com/page', null)).toBe('social')
  })

  it('classifies Instagram as "social"', () => {
    expect(classifyReferrer('https://www.instagram.com/user', null)).toBe('social')
  })

  it('classifies Threads as "social"', () => {
    expect(classifyReferrer('https://www.threads.net/@user', null)).toBe('social')
  })

  // Email (checked before search so mail.google.com → email, not search)
  it('classifies Gmail as "email"', () => {
    expect(classifyReferrer('https://mail.google.com/mail', null)).toBe('email')
  })

  it('classifies Outlook as "email"', () => {
    expect(classifyReferrer('https://outlook.live.com/mail', null)).toBe('email')
  })

  it('classifies Yahoo Mail as "email"', () => {
    expect(classifyReferrer('https://mail.yahoo.com/mail', null)).toBe('email')
  })

  // Messaging
  it('classifies Slack as "messaging"', () => {
    expect(classifyReferrer('https://app.slack.com/client', null)).toBe('messaging')
  })

  it('classifies Teams as "messaging"', () => {
    expect(classifyReferrer('https://teams.microsoft.com/chat', null)).toBe('messaging')
  })

  it('classifies Discord as "messaging"', () => {
    expect(classifyReferrer('https://discord.com/channels', null)).toBe('messaging')
  })

  it('classifies Telegram as "messaging"', () => {
    expect(classifyReferrer('https://web.telegram.org', null)).toBe('messaging')
  })

  // Internal
  it('classifies fanflet.com as "internal"', () => {
    expect(classifyReferrer('https://fanflet.com/dashboard', null)).toBe('internal')
  })

  it('classifies subdomain of fanflet.com as "internal"', () => {
    expect(classifyReferrer('https://app.fanflet.com/page', null)).toBe('internal')
  })

  // Other / edge cases
  it('returns "other" for unknown referrer', () => {
    expect(classifyReferrer('https://example.com', null)).toBe('other')
  })

  it('returns "other" for malformed URL', () => {
    expect(classifyReferrer('not-a-url', null)).toBe('other')
  })

  // Source takes priority over referrer
  it('source "qr" takes priority over referrer hostname', () => {
    expect(classifyReferrer('https://www.linkedin.com/feed', 'qr')).toBe('qr_code')
  })
})
