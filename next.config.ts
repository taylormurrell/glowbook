import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

// The browser only ever talks to our own origin and the Supabase project
// (auth + data API). Allow that origin in connect-src so login and queries work.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

// Notes on the relaxations here:
// - script/style use 'unsafe-inline' (the documented static-CSP approach). A
//   stricter nonce-based CSP would require fully dynamic rendering, which isn't
//   worth the tradeoff for this app.
// - img-src allows https: because scraped product images come from arbitrary
//   retailer CDNs and can't be enumerated ahead of time.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' blob: data: https:`,
  `font-src 'self'`,
  `connect-src 'self' ${supabaseUrl}${isDev ? ' ws:' : ''}`.trim(),
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
]

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
