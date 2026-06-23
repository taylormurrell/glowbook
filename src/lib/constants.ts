import type { Category } from './types'

export const CATEGORIES: Category[] = [
  'jewelry',
  'top',
  'bottom',
  'dress',
  'outerwear',
  'shoes',
  'bag',
  'other',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  jewelry: 'Jewelry',
  top: 'Top',
  bottom: 'Bottom',
  dress: 'Dress / One-Piece',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  bag: 'Bag',
  other: 'Other',
}

export const SLOT_DISPLAY_ORDER: Record<Category, number> = {
  jewelry: 0,
  outerwear: 1,
  dress: 2,
  top: 3,
  bottom: 4,
  bag: 5,
  shoes: 6,
  other: 7,
}
