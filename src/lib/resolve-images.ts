import type { SupabaseClient } from '@supabase/supabase-js'
import type { Outfit, WishlistItem } from './types'

export async function resolveItemImages(supabase: SupabaseClient, items: WishlistItem[]): Promise<WishlistItem[]> {
  return Promise.all(items.map(async (item) => {
    if (item.image_source !== 'uploaded_file' || !item.image_url) return item
    const { data: signed } = await supabase.storage
      .from('item-images')
      .createSignedUrl(item.image_url, 3600)
    return { ...item, image_url: signed?.signedUrl ?? null }
  }))
}

export async function resolveOutfitSlotImages(supabase: SupabaseClient, outfit: Outfit): Promise<Outfit> {
  const slots = await Promise.all((outfit.slots ?? []).map(async (slot) => {
    const item = slot.wishlist_item
    if (!item || item.image_source !== 'uploaded_file' || !item.image_url) return slot
    const { data: signed } = await supabase.storage
      .from('item-images')
      .createSignedUrl(item.image_url, 3600)
    return { ...slot, wishlist_item: { ...item, image_url: signed?.signedUrl ?? null } }
  }))
  return { ...outfit, slots }
}
