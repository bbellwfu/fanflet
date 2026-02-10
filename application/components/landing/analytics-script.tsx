'use client'

import { useEffect } from 'react'

interface AnalyticsScriptProps {
  fanfletId: string
}

export function isPreviewMode(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('preview')
}

export function AnalyticsScript({ fanfletId }: AnalyticsScriptProps) {
  useEffect(() => {
    // Skip tracking for speaker preview visits
    if (isPreviewMode()) return

    const referrer = document.referrer
    const eventType = !referrer ? 'qr_scan' : 'page_view'

    const payload = JSON.stringify({
      fanflet_id: fanfletId,
      event_type: eventType,
      referrer: referrer || undefined,
    })

    // Prefer sendBeacon for better performance (non-blocking, survives page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => {})
    }
  }, [fanfletId])

  return null
}

// Helper function to track resource clicks (called from resource cards)
export function trackResourceClick(fanfletId: string, resourceBlockId: string) {
  // Skip tracking for speaker preview visits
  if (isPreviewMode()) return

  const payload = JSON.stringify({
    fanflet_id: fanfletId,
    event_type: 'resource_click',
    resource_block_id: resourceBlockId,
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
