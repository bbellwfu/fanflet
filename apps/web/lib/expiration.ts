/**
 * Fanflet content expiration: date-only, evaluated at end-of-day UTC.
 */

export const EXPIRATION_PRESETS = ['30d', '60d', '90d', 'none', 'custom'] as const
export type ExpirationPreset = (typeof EXPIRATION_PRESETS)[number]

const PRESET_DAYS: Record<string, number> = { '30d': 30, '60d': 60, '90d': 90 }

/** Format YYYY-MM-DD for date-only storage (UTC date). */
function toDateOnly(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's date in UTC (date-only string). */
export function todayUtcDateOnly(): string {
  return toDateOnly(new Date())
}

/**
 * Compute expiration date from preset/custom and reference date (publish or now).
 * Returns YYYY-MM-DD or null for "none".
 */
export function computeExpirationDate(
  preset: ExpirationPreset,
  customDate: string | null,
  referenceDate: Date | null
): string | null {
  if (preset === 'none') return null
  if (preset === 'custom' && customDate) {
    const d = new Date(customDate)
    if (Number.isNaN(d.getTime())) return null
    return toDateOnly(d)
  }
  const days = preset ? PRESET_DAYS[preset] : 0
  if (!days || !referenceDate) return null
  const ref = new Date(referenceDate)
  ref.setUTCDate(ref.getUTCDate() + days)
  return toDateOnly(ref)
}

/**
 * True if content is expired: expiration_date is set and today (UTC) is after that date.
 */
export function isExpired(expirationDate: string | null): boolean {
  if (!expirationDate) return false
  const today = todayUtcDateOnly()
  return today > expirationDate
}

export type ExpirationStatus = 'active' | 'expiring_soon' | 'expired'

/**
 * Status for dashboard: active (no date or future), expiring_soon (<=7 days), expired.
 */
export function getExpirationStatus(expirationDate: string | null): ExpirationStatus | null {
  if (!expirationDate) return null
  const today = todayUtcDateOnly()
  if (today > expirationDate) return 'expired'
  const exp = new Date(expirationDate + 'T23:59:59.999Z')
  const now = Date.now()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysLeft = Math.ceil((exp.getTime() - now) / msPerDay)
  return daysLeft <= 7 ? 'expiring_soon' : 'active'
}

export interface ParsedExpiration {
  preset: ExpirationPreset
  customDate: string | null
  showExpirationNotice: boolean
}

/**
 * Parse expiration fields from FormData. Validates preset; custom date left to server.
 */
export function parseExpirationFromForm(formData: FormData): ParsedExpiration {
  const presetRaw = (formData.get('expiration_preset') as string) || 'none'
  const preset: ExpirationPreset = EXPIRATION_PRESETS.includes(presetRaw as ExpirationPreset)
    ? (presetRaw as ExpirationPreset)
    : 'none'
  const customDate = (formData.get('expiration_custom_date') as string) || null
  const showExpirationNotice = formData.get('show_expiration_notice') !== 'false'
  return { preset, customDate: customDate || null, showExpirationNotice }
}

/**
 * Compute expiration_date for DB from parsed form + reference date (published_at or now).
 */
export function resolveExpirationDate(
  parsed: ParsedExpiration,
  referenceDate: Date | null
): string | null {
  return computeExpirationDate(parsed.preset, parsed.customDate, referenceDate)
}
