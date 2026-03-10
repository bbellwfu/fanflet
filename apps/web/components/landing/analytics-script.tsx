'use client'

import { useEffect } from 'react'
import { SUBSCRIBER_ID_KEY_PREFIX } from './subscribe-form'

interface AnalyticsScriptProps {
  fanfletId: string
}

export function isPreviewMode(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('preview')
}

/** Map ref query param to analytics source. */
export function getSourceFromRef(): 'direct' | 'qr' | 'portfolio' | 'share' {
  if (typeof window === 'undefined') return 'direct'
  const refParam = new URLSearchParams(window.location.search).get('ref')
  if (refParam === 'qr') return 'qr'
  if (refParam === 'portfolio') return 'portfolio'
  if (refParam === 'share') return 'share'
  return 'direct'
}

export function AnalyticsScript({ fanfletId }: AnalyticsScriptProps) {
  useEffect(() => {
    if (isPreviewMode()) return

    const referrer = document.referrer || undefined
    const params = new URLSearchParams(window.location.search)
    const isQrVisit = params.get('ref') === 'qr'
    const refParam = params.get('ref')
    const source = refParam === 'qr' ? 'qr' : refParam === 'portfolio' ? 'portfolio' : refParam === 'share' ? 'share' : 'direct'

    function beacon(payload: Record<string, string | undefined>) {
      const body = JSON.stringify(payload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }).catch(() => {})
      }
    }

    // Always fire a page_view with source
    beacon({ fanflet_id: fanfletId, event_type: 'page_view', referrer, source })

    // Additionally fire qr_scan when the visit came through a QR code link
    if (isQrVisit) {
      beacon({ fanflet_id: fanfletId, event_type: 'qr_scan', referrer, source })
    }
  }, [fanfletId])

  return null
}

// Helper function to track resource clicks (called from resource cards)
export function trackResourceClick(fanfletId: string, resourceBlockId: string) {
  // Skip tracking for speaker preview visits
  if (isPreviewMode()) return

  let subscriberId: string | null = null
  try {
    subscriberId = typeof window !== 'undefined'
      ? sessionStorage.getItem(`${SUBSCRIBER_ID_KEY_PREFIX}${fanfletId}`)
      : null
  } catch {
    // ignore
  }

  const source = getSourceFromRef()
  const payload: Record<string, string> = {
    fanflet_id: fanfletId,
    event_type: 'resource_click',
    resource_block_id: resourceBlockId,
    source,
  }
  if (subscriberId) payload.subscriber_id = subscriberId

  const body = JSON.stringify(payload)

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
  } else {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {})
  }
}

// Track referral CTA clicks (platform-level metric for admin portal only)
export function trackReferralClick(fanfletId: string) {
  if (isPreviewMode()) return

  const source = getSourceFromRef()
  const payload = JSON.stringify({
    fanflet_id: fanfletId,
    event_type: 'referral_click',
    source,
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {})
  }
}
