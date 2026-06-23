import { NextRequest } from 'next/server'
import * as cheerio from 'cheerio'
import type { ScrapeResult } from '@/lib/types'

export async function POST(request: NextRequest) {
  const { url } = await request.json()

  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return Response.json(buildEmpty(), { status: 200 })
    }

    const html = await res.text()
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
