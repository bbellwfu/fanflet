export function classifyReferrer(referrer: string | null, source: string | null): string {
  if (source === 'qr') return 'qr_code'
  if (source === 'portfolio') return 'portfolio'
  if (source === 'share') return 'share_link'
  if (!referrer) return 'direct'

  let hostname: string
  try {
    hostname = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'other'
  }

  if (/mail\.|outlook\.|gmail\./.test(hostname)) return 'email'
  if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\./.test(hostname)) return 'search'
  if (/linkedin\.|twitter\.|x\.com|facebook\.|instagram\.|threads\.net/.test(hostname)) return 'social'
  if (/slack\.|teams\.|discord\.|telegram\./.test(hostname)) return 'messaging'
  if (hostname.includes('fanflet.com')) return 'internal'

  return 'other'
}
