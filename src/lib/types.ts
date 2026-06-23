export type Category =
  | 'jewelry'
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outerwear'
  | 'shoes'
  | 'bag'
  | 'other'

export type ImageSource = 'scraped_url' | 'uploaded_file' | 'manual_url' | 'none'

export type SlotType = Category

export interface WishlistItem {
  id: string
  user_id: string
  product_url: string
  product_name: string
  brand: string | null
  retailer: string | null
  price: string | null
  category: Category
  color: string | null
  notes: string | null
  image_url: string | null
  image_source: ImageSource
  created_at: string
  updated_at: string
}

export interface Outfit {
  id: string
  user_id: string
  name: string
  notes: string | null
  created_at: string
  updated_at: string
  slots?: OutfitSlot[]
}

export interface OutfitSlot {
  id: string
  outfit_id: string
  slot_type: SlotType
  wishlist_item_id: string | null
  display_order: number
  created_at: string
  updated_at: string
  wishlist_item?: WishlistItem | null
}

export interface ScrapeResult {
  product_name: string | null
  brand: string | null
  retailer: string | null
  price: string | null
  image_url: string | null
  description: string | null
}
