import dns from 'node:dns/promises'
import type { LookupAddress } from 'node:dns'

export class SsrfError extends Error {}

export async function validateScrapeUrl(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new SsrfError('Invalid URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfError('Invalid URL')
  }

  const hostname = parsed.hostname
  let addresses: LookupAddress[]
  try {
    addresses = await dns.lookup(hostname, { all: true })
  } catch {
    throw new SsrfError('Invalid URL')
  }

  if (addresses.length === 0) {
    throw new SsrfError('Invalid URL')
  }

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new SsrfError('Invalid URL')
    }
  }
}

export function isPrivateAddress(ip: string): boolean {
  // IPv6 checks
  const lower = ip.toLowerCase()
  if (lower === '::1') return true                        // loopback
  if (lower === '::') return true                         // unspecified
  if (/^fe[89ab][0-9a-f]:/i.test(ip)) return true        // fe80::/10 link-local
  if (/^f[cd]/i.test(ip)) return true                     // fc00::/7 unique-local

  // IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254): unwrap and check the IPv4 underneath
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateAddress(mapped[1])

  // IPv4 checks
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  const nums = parts.map(Number)
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false

  const [a, b] = nums
  return (
    a === 0 ||                              // 0.0.0.0/8
    a === 10 ||                             // 10.0.0.0/8
    a === 127 ||                            // 127.0.0.0/8 loopback
    (a === 169 && b === 254) ||             // 169.254.0.0/16 link-local
    (a === 172 && b >= 16 && b <= 31) ||   // 172.16.0.0/12
    (a === 192 && b === 168)               // 192.168.0.0/16
  )
}
