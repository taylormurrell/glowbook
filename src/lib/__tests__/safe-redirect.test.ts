import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from '../safe-redirect'

const FALLBACK = '/auth/update-password'

describe('safeRedirectPath', () => {
  it('allows same-origin relative paths', () => {
    expect(safeRedirectPath('/dashboard', FALLBACK)).toBe('/dashboard')
    expect(safeRedirectPath('/wishlist?x=1', FALLBACK)).toBe('/wishlist?x=1')
  })

  it('falls back when next is missing', () => {
    expect(safeRedirectPath(null, FALLBACK)).toBe(FALLBACK)
    expect(safeRedirectPath(undefined, FALLBACK)).toBe(FALLBACK)
    expect(safeRedirectPath('', FALLBACK)).toBe(FALLBACK)
  })

  it('rejects absolute and protocol-relative URLs (open-redirect guard)', () => {
    expect(safeRedirectPath('https://evil.com', FALLBACK)).toBe(FALLBACK)
    expect(safeRedirectPath('//evil.com', FALLBACK)).toBe(FALLBACK)
    expect(safeRedirectPath('/\\evil.com', FALLBACK)).toBe(FALLBACK)
    expect(safeRedirectPath('javascript:alert(1)', FALLBACK)).toBe(FALLBACK)
  })
})
