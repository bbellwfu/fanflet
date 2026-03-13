import { describe, it, expect } from 'vitest'
import { EntitlementError, entitlementErrorToResult } from '../entitlement-guards'

describe('EntitlementError', () => {
  it('has the correct name and feature', () => {
    const err = new EntitlementError('click_through_analytics')
    expect(err.name).toBe('EntitlementError')
    expect(err.feature).toBe('click_through_analytics')
    expect(err.message).toContain('click_through_analytics')
  })

  it('uses custom message when provided', () => {
    const err = new EntitlementError('sponsor_visibility', 'Custom message')
    expect(err.message).toBe('Custom message')
    expect(err.feature).toBe('sponsor_visibility')
  })

  it('is an instance of Error', () => {
    const err = new EntitlementError('test')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('entitlementErrorToResult', () => {
  it('returns upgrade message for feature entitlement errors', () => {
    const err = new EntitlementError('click_through_analytics')
    const result = entitlementErrorToResult(err)
    expect(result.error).toContain('higher plan')
  })

  it('returns custom message for active_sponsor_connection errors', () => {
    const err = new EntitlementError('active_sponsor_connection', 'Not connected')
    const result = entitlementErrorToResult(err)
    expect(result.error).toBe('Not connected')
  })

  it('returns generic error message for non-EntitlementError Error instances', () => {
    const err = new Error('Something broke')
    const result = entitlementErrorToResult(err)
    expect(result.error).toBe('Something broke')
  })

  it('returns fallback message for unknown error types', () => {
    const result = entitlementErrorToResult('string error')
    expect(result.error).toBe('An unexpected error occurred.')
  })

  it('returns fallback message for null', () => {
    const result = entitlementErrorToResult(null)
    expect(result.error).toBe('An unexpected error occurred.')
  })
})
