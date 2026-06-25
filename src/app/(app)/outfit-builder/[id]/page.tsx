import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OutfitBuilder from '@/components/OutfitBuilder'
import type { Outfit, WishlistItem } from '@/lib/types'
import { resolveItemImages, resolveOutfitSlotImages } from '@/lib/resolve-images'

export default async function EditOutfitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawOutfit, error }, { data: rawItems }] = await Promise.all([
    supabase
      .from('outfits')
      .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('category'),
  ])

  if (error || !rawOutfit) notFound()

  const [outfit, items] = await Promise.all([
    resolveOutfitSlotImages(supabase, rawOutfit as Outfit),
    resolveItemImages(supabase, (rawItems ?? []) as WishlistItem[]),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Edit outfit</h1>
        <p className="text-sm text-gray-400 mt-0.5">{outfit.name}</p>
      </div>
      <OutfitBuilder
        wishlistItems={items}
        existingOutfit={outfit}
      />
    </div>
  )
}
