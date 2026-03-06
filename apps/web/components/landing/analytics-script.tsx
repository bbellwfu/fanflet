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

export function AnalyticsScript({ fanfletId }: AnalyticsScriptProps) {
  useEffect(() => {
    if (isPreviewMode()) return

    const referrer = document.referrer || undefined
    const params = new URLSearchParams(window.location.search)
    const isQrVisit = params.get('ref') === 'qr'

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

    // Always fire a page_view
    beacon({ fanflet_id: fanfletId, event_type: 'page_view', referrer })

    // Additionally fire qr_scan when the visit came through a QR code link
    if (isQrVisit) {
      beacon({ fanflet_id: fanfletId, event_type: 'qr_scan', referrer })
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

  const payload: Record<string, string> = {
    fanflet_id: fanfletId,
    event_type: 'resource_click',
    resource_block_id: resourceBlockId,
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

  const payload = JSON.stringify({
    fanflet_id: fanfletId,
    event_type: 'referral_click',
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
