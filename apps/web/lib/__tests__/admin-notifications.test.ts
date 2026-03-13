import { describe, it, expect } from 'vitest'
import {
  buildSubjectAndBody,
  escapeHtml,
  type SpeakerSignupPayload,
  type SponsorSignupPayload,
  type FanfletCreatedPayload,
  type OnboardingCompletedPayload,
  type SponsorInquiryPayload,
} from '../admin-notifications'

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('handles all special chars together', () => {
    expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;')
  })

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })
})

describe('buildSubjectAndBody', () => {
  it('builds speaker_signup notification', () => {
    const payload: SpeakerSignupPayload = {
      speakerId: 'sp-1',
      email: 'speaker@test.com',
      name: 'Jane Doe',
    }
    const { subject, html } = buildSubjectAndBody('speaker_signup', payload)
    expect(subject).toContain('Jane Doe')
    expect(html).toContain('speaker@test.com')
    expect(html).toContain('sp-1')
  })

  it('builds speaker_signup with email fallback when name is empty', () => {
    const payload: SpeakerSignupPayload = {
      speakerId: 'sp-1',
      email: 'user@test.com',
      name: '',
    }
    const { subject } = buildSubjectAndBody('speaker_signup', payload)
    expect(subject).toContain('user@test.com')
  })

  it('builds sponsor_signup notification', () => {
    const payload: SponsorSignupPayload = {
      sponsorId: 'spon-1',
      companyName: 'Acme Corp',
      contactEmail: 'acme@test.com',
    }
    const { subject, html } = buildSubjectAndBody('sponsor_signup', payload)
    expect(subject).toContain('Acme Corp')
    expect(html).toContain('acme@test.com')
    expect(html).toContain('spon-1')
  })

  it('builds fanflet_created notification', () => {
    const payload: FanfletCreatedPayload = {
      fanfletId: 'fan-1',
      title: 'My Talk',
      speakerId: 'sp-1',
      speakerName: 'Jane',
      speakerEmail: 'jane@test.com',
    }
    const { subject, html } = buildSubjectAndBody('fanflet_created', payload)
    expect(subject).toContain('My Talk')
    expect(html).toContain('Jane')
    expect(html).toContain('jane@test.com')
  })

  it('builds onboarding_completed notification', () => {
    const payload: OnboardingCompletedPayload = {
      speakerId: 'sp-1',
      speakerName: 'Jane Doe',
      speakerEmail: 'jane@test.com',
    }
    const { subject, html } = buildSubjectAndBody('onboarding_completed', payload)
    expect(subject).toContain('Jane Doe')
    expect(html).toContain('onboarding')
  })

  it('builds sponsor_inquiry notification', () => {
    const payload: SponsorInquiryPayload = {
      inquiryId: 'inq-1',
      name: 'Bob Smith',
      email: 'bob@test.com',
      details: 'I want to sponsor speakers in the dental industry.',
    }
    const { subject, html } = buildSubjectAndBody('sponsor_inquiry', payload)
    expect(subject).toContain('Bob Smith')
    expect(html).toContain('bob@test.com')
    expect(html).toContain('dental industry')
  })

  it('truncates long sponsor_inquiry details', () => {
    const payload: SponsorInquiryPayload = {
      inquiryId: 'inq-1',
      name: 'Bob',
      email: 'bob@test.com',
      details: 'A'.repeat(300),
    }
    const { html } = buildSubjectAndBody('sponsor_inquiry', payload)
    expect(html).toContain('…')
  })

  it('escapes HTML in user-provided fields', () => {
    const payload: SpeakerSignupPayload = {
      speakerId: 'sp-1',
      email: '<script>alert(1)</script>',
      name: 'Test',
    }
    const { html } = buildSubjectAndBody('speaker_signup', payload)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
