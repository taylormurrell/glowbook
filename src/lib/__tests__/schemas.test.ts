import { describe, it, expect } from 'vitest'
import {
  CreateItemSchema,
  UpdateItemSchema,
  CreateOutfitSchema,
  ScrapeSchema,
  UuidParamSchema,
  UploadFileSchema,
} from '../schemas'

// ─── CreateItemSchema ────────────────────────────────────────────────────────

describe('CreateItemSchema', () => {
  const valid = {
    product_url: 'https://example.com/item',
    product_name: 'Silk blouse',
    category: 'top',
    image_source: 'scraped_url',
  }

  const without = (key: keyof typeof valid) => {
    const copy: Record<string, unknown> = { ...valid }
    delete copy[key]
    return copy
  }

  it('accepts a minimal valid payload', () => {
    expect(CreateItemSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts all optional fields present', () => {
    const result = CreateItemSchema.safeParse({
      ...valid,
      brand: 'Zara',
      retailer: 'zara',
      price: '49.99',
      color: 'ivory',
      notes: 'size up',
      image_url: 'https://cdn.example.com/img.jpg',
    })
    expect(result.success).toBe(true)
  })

  it('accepts null for nullable optional fields', () => {
    const result = CreateItemSchema.safeParse({ ...valid, brand: null, image_url: null })
    expect(result.success).toBe(true)
  })

  it('rejects missing product_name', () => {
    expect(CreateItemSchema.safeParse(without('product_name')).success).toBe(false)
  })

  it('rejects empty product_name', () => {
    expect(CreateItemSchema.safeParse({ ...valid, product_name: '' }).success).toBe(false)
  })

  it('rejects missing category', () => {
    expect(CreateItemSchema.safeParse(without('category')).success).toBe(false)
  })

  it('rejects an invalid category value', () => {
    expect(CreateItemSchema.safeParse({ ...valid, category: 'socks' }).success).toBe(false)
  })

  it('rejects missing image_source', () => {
    expect(CreateItemSchema.safeParse(without('image_source')).success).toBe(false)
  })

  it('rejects an invalid image_source value', () => {
    expect(CreateItemSchema.safeParse({ ...valid, image_source: 'unknown' }).success).toBe(false)
  })

  it('rejects an empty object', () => {
    expect(CreateItemSchema.safeParse({}).success).toBe(false)
  })
})

// ─── UpdateItemSchema ────────────────────────────────────────────────────────

describe('UpdateItemSchema', () => {
  it('accepts an empty object (all fields optional on update)', () => {
    expect(UpdateItemSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a partial update with just product_name', () => {
    expect(UpdateItemSchema.safeParse({ product_name: 'New name' }).success).toBe(true)
  })

  it('still rejects an invalid category on partial update', () => {
    expect(UpdateItemSchema.safeParse({ category: 'socks' }).success).toBe(false)
  })

  it('still rejects empty product_name on partial update', () => {
    expect(UpdateItemSchema.safeParse({ product_name: '' }).success).toBe(false)
  })
})

// ─── CreateOutfitSchema ──────────────────────────────────────────────────────

describe('CreateOutfitSchema', () => {
  it('accepts a name with no slots', () => {
    expect(CreateOutfitSchema.safeParse({ name: 'Date night' }).success).toBe(true)
  })

  it('defaults slots to an empty array when omitted', () => {
    const result = CreateOutfitSchema.safeParse({ name: 'Date night' })
    expect(result.success && result.data.slots).toEqual([])
  })

  it('accepts valid slots', () => {
    const result = CreateOutfitSchema.safeParse({
      name: 'Date night',
      slots: [
        { slot_type: 'top', wishlist_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', display_order: 0 },
        { slot_type: 'shoes', wishlist_item_id: null },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('defaults slot display_order to 0 when omitted', () => {
    const result = CreateOutfitSchema.safeParse({
      name: 'Test',
      slots: [{ slot_type: 'bag', wishlist_item_id: null }],
    })
    expect(result.success && result.data.slots[0].display_order).toBe(0)
  })

  it('rejects missing name', () => {
    expect(CreateOutfitSchema.safeParse({}).success).toBe(false)
  })

  it('rejects empty name', () => {
    expect(CreateOutfitSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects a slot with an invalid slot_type', () => {
    const result = CreateOutfitSchema.safeParse({
      name: 'Test',
      slots: [{ slot_type: 'hat', wishlist_item_id: null }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a slot with a non-uuid wishlist_item_id', () => {
    const result = CreateOutfitSchema.safeParse({
      name: 'Test',
      slots: [{ slot_type: 'top', wishlist_item_id: 'not-a-uuid' }],
    })
    expect(result.success).toBe(false)
  })
})

// ─── ScrapeSchema ────────────────────────────────────────────────────────────

describe('ScrapeSchema', () => {
  it('accepts a non-empty url string', () => {
    expect(ScrapeSchema.safeParse({ url: 'https://example.com' }).success).toBe(true)
  })

  it('rejects a missing url', () => {
    expect(ScrapeSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an empty url string', () => {
    expect(ScrapeSchema.safeParse({ url: '' }).success).toBe(false)
  })

  it('rejects a non-string url', () => {
    expect(ScrapeSchema.safeParse({ url: 42 }).success).toBe(false)
  })
})

// ─── UuidParamSchema ─────────────────────────────────────────────────────────

describe('UuidParamSchema', () => {
  it('accepts a valid v4 UUID', () => {
    expect(UuidParamSchema.safeParse({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }).success).toBe(true)
  })

  it('rejects a plain string', () => {
    expect(UuidParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects a missing id', () => {
    expect(UuidParamSchema.safeParse({}).success).toBe(false)
  })

  it('rejects a numeric id', () => {
    expect(UuidParamSchema.safeParse({ id: 123 }).success).toBe(false)
  })
})

// ─── UploadFileSchema ────────────────────────────────────────────────────────

describe('UploadFileSchema', () => {
  function makeFile(name: string, type: string, sizeBytes: number): File {
    const content = new Uint8Array(sizeBytes)
    return new File([content], name, { type })
  }

  it('accepts a valid JPEG under 5MB', () => {
    const result = UploadFileSchema.safeParse({ file: makeFile('photo.jpg', 'image/jpeg', 1024) })
    expect(result.success).toBe(true)
  })

  it('accepts PNG, WebP, and GIF', () => {
    for (const type of ['image/png', 'image/webp', 'image/gif']) {
      expect(UploadFileSchema.safeParse({ file: makeFile('img', type, 1024) }).success).toBe(true)
    }
  })

  it('rejects an unsupported MIME type', () => {
    const result = UploadFileSchema.safeParse({ file: makeFile('doc.pdf', 'application/pdf', 1024) })
    expect(result.success).toBe(false)
  })

  it('rejects a file over 5MB', () => {
    const result = UploadFileSchema.safeParse({ file: makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1) })
    expect(result.success).toBe(false)
  })

  it('rejects a non-File value', () => {
    expect(UploadFileSchema.safeParse({ file: 'not-a-file' }).success).toBe(false)
    expect(UploadFileSchema.safeParse({ file: null }).success).toBe(false)
    expect(UploadFileSchema.safeParse({}).success).toBe(false)
  })
})
