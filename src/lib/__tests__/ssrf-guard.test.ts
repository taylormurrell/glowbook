import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateScrapeUrl, safeFetch, isPrivateAddress, SsrfError } from '../ssrf-guard'

describe('isPrivateAddress', () => {
  it('flags IPv4 private ranges', () => {
    expect(isPrivateAddress('10.0.0.1')).toBe(true)
    expect(isPrivateAddress('10.255.255.255')).toBe(true)
    expect(isPrivateAddress('172.16.0.1')).toBe(true)
    expect(isPrivateAddress('172.31.255.255')).toBe(true)
    expect(isPrivateAddress('192.168.1.1')).toBe(true)
    expect(isPrivateAddress('127.0.0.1')).toBe(true)
    expect(isPrivateAddress('169.254.1.1')).toBe(true)
    expect(isPrivateAddress('0.0.0.0')).toBe(true)
  })

  it('allows public IPv4', () => {
    expect(isPrivateAddress('1.1.1.1')).toBe(false)
    expect(isPrivateAddress('8.8.8.8')).toBe(false)
    expect(isPrivateAddress('172.15.0.1')).toBe(false)
    expect(isPrivateAddress('172.32.0.1')).toBe(false)
    expect(isPrivateAddress('192.169.0.1')).toBe(false)
  })

  it('flags IPv6 loopback and private ranges', () => {
    expect(isPrivateAddress('::1')).toBe(true)
    expect(isPrivateAddress('::')).toBe(true)
    expect(isPrivateAddress('fe80::1')).toBe(true)
    expect(isPrivateAddress('fc00::1')).toBe(true)
    expect(isPrivateAddress('fd12:3456::1')).toBe(true)
  })

  it('flags IPv4-mapped IPv6 addresses by unwrapping the IPv4 underneath', () => {
    expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateAddress('::ffff:169.254.169.254')).toBe(true)
    expect(isPrivateAddress('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateAddress('::ffff:192.168.1.1')).toBe(true)
  })

  it('allows IPv4-mapped IPv6 wrapping a public address', () => {
    expect(isPrivateAddress('::ffff:8.8.8.8')).toBe(false)
    expect(isPrivateAddress('::ffff:1.1.1.1')).toBe(false)
  })
})

describe('validateScrapeUrl', () => {
  it('rejects non-http schemes', async () => {
    await expect(validateScrapeUrl('ftp://example.com')).rejects.toThrow(SsrfError)
    await expect(validateScrapeUrl('file:///etc/passwd')).rejects.toThrow(SsrfError)
    await expect(validateScrapeUrl('javascript:alert(1)')).rejects.toThrow(SsrfError)
  })

  it('rejects URLs with private IP addresses', async () => {
    // Raw IPs in the URL resolve to themselves via dns.lookup
    await expect(validateScrapeUrl('http://192.168.1.1/')).rejects.toThrow(SsrfError)
    await expect(validateScrapeUrl('http://10.0.0.1/')).rejects.toThrow(SsrfError)
    await expect(validateScrapeUrl('http://127.0.0.1/')).rejects.toThrow(SsrfError)
    await expect(validateScrapeUrl('http://169.254.169.254/')).rejects.toThrow(SsrfError)
  })

  it('rejects malformed URLs', async () => {
    await expect(validateScrapeUrl('not-a-url')).rejects.toThrow(SsrfError)
    await expect(validateScrapeUrl('')).rejects.toThrow(SsrfError)
  })
})

describe('safeFetch (redirect handling)', () => {
  afterEach(() => vi.unstubAllGlobals())

  // Minimal Response stand-in: safeFetch only reads .status and .headers.get('location').
  // Redirect targets use literal IPs so validateScrapeUrl resolves them without network DNS.
  function fakeResponse(status: number, location?: string | null): Response {
    return {
      status,
      ok: status >= 200 && status < 300,
      headers: { get: (k: string) => (k.toLowerCase() === 'location' ? location ?? null : null) },
    } as unknown as Response
  }

  it('rejects a redirect that points at an internal address', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(fakeResponse(302, 'http://10.0.0.1/')))
    await expect(safeFetch('http://93.184.216.34/')).rejects.toThrow(SsrfError)
  })

  it('follows a redirect to a public address and returns the final response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fakeResponse(302, 'http://93.184.216.34/final'))
      .mockResolvedValueOnce(fakeResponse(200))
    vi.stubGlobal('fetch', fetchMock)

    const res = await safeFetch('http://93.184.216.34/')
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns the response when a redirect has no location header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(fakeResponse(302, null)))
    const res = await safeFetch('http://93.184.216.34/')
    expect(res.status).toBe(302)
  })
})
