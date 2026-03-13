import { describe, it, expect } from 'vitest'
import {
  toSocialLinksRecord,
  getStoredDefaultThemePreset,
  getDefaultThemePreset,
  hasStoredDefaultThemePreset,
  isOnboardingDismissed,
  isOnboardingNotificationSent,
} from '../speaker-preferences'
import { DEFAULT_THEME_ID } from '../themes'

describe('toSocialLinksRecord', () => {
  it('returns empty object for null', () => {
    expect(toSocialLinksRecord(null)).toEqual({})
  })

  it('returns empty object for undefined', () => {
    expect(toSocialLinksRecord(undefined)).toEqual({})
  })

  it('returns empty object for string', () => {
    expect(toSocialLinksRecord('hello')).toEqual({})
  })

  it('returns empty object for number', () => {
    expect(toSocialLinksRecord(42)).toEqual({})
  })

  it('returns the object for a valid record', () => {
    const input = { twitter: '@user', website: 'https://example.com' }
    expect(toSocialLinksRecord(input)).toEqual(input)
  })
})

describe('getStoredDefaultThemePreset', () => {
  it('returns null for null input', () => {
    expect(getStoredDefaultThemePreset(null)).toBeNull()
  })

  it('returns null when default_theme_preset is missing', () => {
    expect(getStoredDefaultThemePreset({})).toBeNull()
  })

  it('returns null when default_theme_preset is not a string', () => {
    expect(getStoredDefaultThemePreset({ default_theme_preset: 42 })).toBeNull()
  })

  it('returns null for invalid theme ID', () => {
    expect(getStoredDefaultThemePreset({ default_theme_preset: 'nonexistent' })).toBeNull()
  })

  it('returns valid theme ID', () => {
    expect(getStoredDefaultThemePreset({ default_theme_preset: 'crimson' })).toBe('crimson')
  })

  it('returns default theme ID', () => {
    expect(getStoredDefaultThemePreset({ default_theme_preset: 'default' })).toBe('default')
  })
})

describe('getDefaultThemePreset', () => {
  it('returns stored preset when valid', () => {
    expect(getDefaultThemePreset({ default_theme_preset: 'forest' })).toBe('forest')
  })

  it('returns DEFAULT_THEME_ID when no stored preset', () => {
    expect(getDefaultThemePreset(null)).toBe(DEFAULT_THEME_ID)
  })

  it('returns DEFAULT_THEME_ID for invalid preset', () => {
    expect(getDefaultThemePreset({ default_theme_preset: 'bogus' })).toBe(DEFAULT_THEME_ID)
  })
})

describe('hasStoredDefaultThemePreset', () => {
  it('returns true when valid preset is stored', () => {
    expect(hasStoredDefaultThemePreset({ default_theme_preset: 'crimson' })).toBe(true)
  })

  it('returns false when no preset stored', () => {
    expect(hasStoredDefaultThemePreset(null)).toBe(false)
  })

  it('returns false for invalid preset', () => {
    expect(hasStoredDefaultThemePreset({ default_theme_preset: 'fake' })).toBe(false)
  })
})

describe('isOnboardingDismissed', () => {
  it('returns false for null', () => {
    expect(isOnboardingDismissed(null)).toBe(false)
  })

  it('returns false when onboarding key is missing', () => {
    expect(isOnboardingDismissed({})).toBe(false)
  })

  it('returns false when onboarding is not an object', () => {
    expect(isOnboardingDismissed({ onboarding: 'yes' })).toBe(false)
  })

  it('returns false when dismissed is false', () => {
    expect(isOnboardingDismissed({ onboarding: { dismissed: false } })).toBe(false)
  })

  it('returns true when dismissed is true', () => {
    expect(isOnboardingDismissed({ onboarding: { dismissed: true } })).toBe(true)
  })

  it('returns true for truthy dismissed value', () => {
    expect(isOnboardingDismissed({ onboarding: { dismissed: 1 } })).toBe(true)
  })
})

describe('isOnboardingNotificationSent', () => {
  it('returns false for null', () => {
    expect(isOnboardingNotificationSent(null)).toBe(false)
  })

  it('returns false when onboarding is missing', () => {
    expect(isOnboardingNotificationSent({})).toBe(false)
  })

  it('returns false when notification_sent is false', () => {
    expect(isOnboardingNotificationSent({ onboarding: { notification_sent: false } })).toBe(false)
  })

  it('returns true when notification_sent is true', () => {
    expect(isOnboardingNotificationSent({ onboarding: { notification_sent: true } })).toBe(true)
  })
})
