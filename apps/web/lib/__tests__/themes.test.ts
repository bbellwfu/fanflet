import { describe, it, expect } from 'vitest'
import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  getThemeById,
  getThemeCSSVariables,
  resolveThemeId,
} from '../themes'

describe('THEME_PRESETS', () => {
  it('contains at least one theme', () => {
    expect(THEME_PRESETS.length).toBeGreaterThan(0)
  })

  it('has a default theme', () => {
    const defaultTheme = THEME_PRESETS.find((t) => t.id === DEFAULT_THEME_ID)
    expect(defaultTheme).toBeDefined()
    expect(defaultTheme!.name).toBe('Navy')
  })

  it('every theme has required color variables', () => {
    const requiredVars = [
      '--theme-primary',
      '--theme-primary-mid',
      '--theme-primary-dark',
      '--theme-primary-light',
      '--theme-accent',
      '--theme-accent-hover',
      '--theme-hero-text',
      '--theme-hero-text-muted',
    ]
    for (const theme of THEME_PRESETS) {
      for (const varName of requiredVars) {
        expect(theme.colors[varName], `${theme.id} missing ${varName}`).toBeDefined()
      }
    }
  })

  it('all theme IDs are unique', () => {
    const ids = THEME_PRESETS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('getThemeById', () => {
  it('returns the correct theme for a valid ID', () => {
    const theme = getThemeById('crimson')
    expect(theme.id).toBe('crimson')
    expect(theme.name).toBe('Crimson')
  })

  it('returns default theme for unknown ID', () => {
    const theme = getThemeById('nonexistent')
    expect(theme.id).toBe(DEFAULT_THEME_ID)
  })

  it('returns default theme for empty string', () => {
    const theme = getThemeById('')
    expect(theme.id).toBe(DEFAULT_THEME_ID)
  })

  it('returns each known theme correctly', () => {
    for (const preset of THEME_PRESETS) {
      const theme = getThemeById(preset.id)
      expect(theme.id).toBe(preset.id)
    }
  })
})

describe('getThemeCSSVariables', () => {
  it('returns color variables for a valid theme', () => {
    const vars = getThemeCSSVariables('forest')
    expect(vars).toHaveProperty('--theme-primary')
  })

  it('returns default theme variables for null', () => {
    const vars = getThemeCSSVariables(null)
    const defaultVars = getThemeCSSVariables(DEFAULT_THEME_ID)
    expect(vars).toEqual(defaultVars)
  })

  it('returns default theme variables for undefined', () => {
    const vars = getThemeCSSVariables(undefined)
    const defaultVars = getThemeCSSVariables(DEFAULT_THEME_ID)
    expect(vars).toEqual(defaultVars)
  })
})

describe('resolveThemeId', () => {
  it('returns preset from theme config', () => {
    expect(resolveThemeId({ preset: 'crimson' })).toBe('crimson')
  })

  it('returns default for null config', () => {
    expect(resolveThemeId(null)).toBe(DEFAULT_THEME_ID)
  })

  it('returns default for undefined config', () => {
    expect(resolveThemeId(undefined)).toBe(DEFAULT_THEME_ID)
  })

  it('returns default for empty object', () => {
    expect(resolveThemeId({})).toBe(DEFAULT_THEME_ID)
  })

  it('returns default when preset is not a string', () => {
    expect(resolveThemeId({ preset: 123 })).toBe(DEFAULT_THEME_ID)
  })
})
