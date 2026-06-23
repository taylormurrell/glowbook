import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OutfitCard from '@/components/OutfitCard'
import ItemImage from '@/components/ItemImage'
import type { Outfit, WishlistItem } from '@/lib/types'
import { resolveItemImages, resolveOutfitSlotImages } from '@/lib/resolve-images'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: rawItems }, { data: rawOutfits }] = await Promise.all([
    supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('outfits')
      .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const [items, outfits] = await Promise.all([
    resolveItemImages(supabase, (rawItems ?? []) as WishlistItem[]),
    Promise.all((rawOutfits ?? []).map(o => resolveOutfitSlotImages(supabase, o as Outfit))),
  ])

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {items?.length ?? 0} wishlist items &middot; {outfits?.length ?? 0} outfits
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/wishlist?add=1"
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            + Add item
          </Link>
          <Link
            href="/outfit-builder"
            className="px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Create outfit
          </Link>
        </div>
      </div>

      {/* Recent wishlist items */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent wishlist items</h2>
          <Link href="/wishlist" className="text-xs text-gray-400 hover:text-gray-700">View all →</Link>
        </div>

        {!items?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">No items yet.</p>
            <Link href="/wishlist?add=1" className="mt-3 inline-block text-sm font-medium text-gray-900 underline underline-offset-2">
              Add your first item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
            {(items as WishlistItem[]).map(item => (
              <Link key={item.id} href="/wishlist">
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="aspect-square bg-gray-50">
                    {item.image_url ? (
                      <ItemImage src={item.image_url} alt={item.product_name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200 text-xs">?</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-700 truncate">{item.product_name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent outfits */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent outfits</h2>
          <Link href="/outfits" className="text-xs text-gray-400 hover:text-gray-700">View all →</Link>
        </div>

        {!outfits?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">No outfits yet.</p>
            <Link href="/outfit-builder" className="mt-3 inline-block text-sm font-medium text-gray-900 underline underline-offset-2">
              Build your first outfit
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(outfits as Outfit[]).map(outfit => (
              <Link key={outfit.id} href={`/outfits/${outfit.id}`}>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <OutfitCard outfit={outfit} size="sm" />
                  {outfit.name && (
                    <div className="px-3 pb-3">
                      <p className="text-xs font-medium text-gray-600 truncate">{outfit.name}</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
