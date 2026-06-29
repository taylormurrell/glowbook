import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import type { ScrapeResult } from '@/lib/types'
import { validateScrapeUrl, safeFetch, SsrfError } from '@/lib/ssrf-guard'
import { ScrapeSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  const parsed = ScrapeSchema.safeParse(await request.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { url } = parsed.data

  try {
    await validateScrapeUrl(url)
  } catch (e) {
    if (e instanceof SsrfError) {
      return Response.json({ error: 'Invalid URL' }, { status: 400 })
    }
    return Response.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await safeFetch(url)

    if (!res.ok) {
      return Response.json(buildEmpty(), { status: 200 })
    }

    // Only parse HTML, and cap the amount we read so a huge or hostile
    // response can't exhaust server memory.
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return Response.json(buildEmpty(), { status: 200 })
    }

    const html = await readCapped(res, MAX_HTML_BYTES)
    if (html === null) {
      return Response.json(buildEmpty(), { status: 200 })
    }
    const $ = cheerio.load(html)

    const result: ScrapeResult = {
      product_name: null,
      brand: null,
      retailer: extractRetailer(url),
      price: null,
      image_url: null,
      description: null,
    }

    // Open Graph
    result.image_url = $('meta[property="og:image"]').attr('content') ?? null
    result.product_name = $('meta[property="og:title"]').attr('content') ?? null
    result.description = $('meta[property="og:description"]').attr('content') ?? null

    // Try JSON-LD product schema
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() ?? '{}')
        const product = findProduct(data as JsonLd)
        if (!product) return

        if (!result.product_name && product.name) result.product_name = String(product.name)
        const brand = product.brand as JsonLd | undefined
        if (!result.brand && brand?.name) result.brand = String(brand.name)
        if (!result.image_url && product.image) {
          const img = product.image
          result.image_url = String(Array.isArray(img) ? img[0] : img)
        }
        if (!result.price) {
          const offers = product.offers
          const offer = (Array.isArray(offers) ? offers[0] : offers) as JsonLd | undefined
          if (offer?.price) result.price = String(offer.price)
        }
      } catch {
        // ignore parse errors
      }
    })

    // Fallbacks
    if (!result.product_name) {
      result.product_name = $('h1').first().text().trim() || $('title').text().trim() || null
    }

    // Resolve relative image URLs
    if (result.image_url && result.image_url.startsWith('/')) {
      const origin = new URL(url).origin
      result.image_url = origin + result.image_url
    }

    // Clean up product name (OG titles often have " | Brand" suffixes)
    if (result.product_name && result.product_name.length > 120) {
      result.product_name = result.product_name.substring(0, 120)
    }

    return Response.json(result)
  } catch {
    return Response.json(buildEmpty(), { status: 200 })
  }
}

const MAX_HTML_BYTES = 2_000_000 // 2 MB cap on scraped HTML

// Read a response body up to `limit` bytes. Returns null if the body exceeds
// the cap (we'd rather return nothing than buffer an unbounded response).
async function readCapped(res: Response, limit: number): Promise<string | null> {
  const reader = res.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(concatChunks(chunks, total))
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function buildEmpty(): ScrapeResult {
  return { product_name: null, brand: null, retailer: null, price: null, image_url: null, description: null }
}

function extractRetailer(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    const parts = hostname.split('.')
    return parts.length >= 2 ? parts[parts.length - 2] : hostname
  } catch {
    return null
  }
}

type JsonLd = Record<string, unknown>

function findProduct(data: JsonLd): JsonLd | null {
  if (!data || typeof data !== 'object') return null
  if (data['@type'] === 'Product') return data
  if (Array.isArray(data['@graph'])) {
    for (const item of data['@graph'] as JsonLd[]) {
      const found = findProduct(item)
      if (found) return found
    }
  }
  return null
}
