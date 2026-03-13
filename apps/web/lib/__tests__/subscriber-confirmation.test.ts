import { describe, it, expect } from 'vitest'
import { getConfirmationEmailConfig } from '../subscriber-confirmation'

describe('getConfirmationEmailConfig', () => {
  it('returns fanflet-level config when enabled is explicitly set', () => {
    const result = getConfirmationEmailConfig(
      { confirmation_email_config: { enabled: false, subject: 'Custom', body: 'Body' } },
      { social_links: null }
    )
    expect(result.enabled).toBe(false)
    expect(result.subject).toBe('Custom')
    expect(result.body).toBe('Body')
  })

  it('returns fanflet-level enabled=true when set', () => {
    const result = getConfirmationEmailConfig(
      { confirmation_email_config: { enabled: true } },
      { social_links: null }
    )
    expect(result.enabled).toBe(true)
    expect(result.subject).toBeNull()
    expect(result.body).toBeNull()
  })

  it('falls back to speaker config when fanflet config is null', () => {
    const result = getConfirmationEmailConfig(
      { confirmation_email_config: null },
      { social_links: { confirmation_email: { enabled: false, subject: 'Speaker Subject' } } }
    )
    expect(result.enabled).toBe(false)
    expect(result.subject).toBe('Speaker Subject')
  })

  it('falls back to speaker config when fanflet config has no enabled field', () => {
    const result = getConfirmationEmailConfig(
      { confirmation_email_config: { subject: 'Ignored' } },
      { social_links: { confirmation_email: { enabled: true, body: 'Speaker Body' } } }
    )
    expect(result.enabled).toBe(true)
    expect(result.body).toBe('Speaker Body')
  })

  it('defaults to enabled=true when neither fanflet nor speaker has config', () => {
    const result = getConfirmationEmailConfig(
      { confirmation_email_config: null },
      { social_links: null }
    )
    expect(result.enabled).toBe(true)
    expect(result.subject).toBeNull()
    expect(result.body).toBeNull()
  })

  it('defaults to enabled=true when speaker has empty social_links', () => {
    const result = getConfirmationEmailConfig(
      { confirmation_email_config: null },
      { social_links: {} }
    )
    expect(result.enabled).toBe(true)
  })

  it('defaults to enabled=true when speaker confirmation_email exists but has no enabled', () => {
    const result = getConfirmationEmailConfig(
      { confirmation_email_config: null },
      { social_links: { confirmation_email: { subject: 'Hey' } } }
    )
    expect(result.enabled).toBe(true)
    expect(result.subject).toBe('Hey')
  })
})
