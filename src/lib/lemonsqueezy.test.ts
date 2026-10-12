import { afterEach, describe, expect, it, vi } from 'vitest'
import { isCheckoutOrigin } from './lemonsqueezy'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isCheckoutOrigin', () => {
  it.each([
    'https://lemonsqueezy.com',
    'https://app.lemonsqueezy.com',
    'https://betbacktest.lemonsqueezy.com',
  ])('accepts %s', origin => {
    expect(isCheckoutOrigin(origin)).toBe(true)
  })

  it.each([
    'http://app.lemonsqueezy.com',
    'https://lemonsqueezy.com.evil.example',
    'https://evillemonsqueezy.com',
    'https://example.com',
    'null',
    '',
  ])('rejects %j', origin => {
    expect(isCheckoutOrigin(origin)).toBe(false)
  })

  it('accepts the configured store origin', () => {
    vi.stubEnv('VITE_LS_STORE_URL', 'https://pay.betbacktest.com')
    expect(isCheckoutOrigin('https://pay.betbacktest.com')).toBe(true)
    expect(isCheckoutOrigin('https://other.betbacktest.com')).toBe(false)
  })
})
