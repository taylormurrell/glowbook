import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OutfitCard from '@/components/OutfitCard'
import type { Outfit } from '@/lib/types'
import { resolveOutfitSlotImages } from '@/lib/resolve-images'

export default async function OutfitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawOutfits } = await supabase
    .from('outfits')
    .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const outfits = await Promise.all((rawOutfits ?? []).map(o => resolveOutfitSlotImages(supabase, o as Outfit)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Outfits</h1>
        <Link
          href="/outfit-builder"
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Create outfit
        </Link>
      </div>

      {!outfits?.length ? (
        <div className="text-center py-20">
          <p className="text-sm text-gray-400 mb-4">No outfits yet.</p>
          <Link
            href="/outfit-builder"
            className="text-sm font-medium text-gray-900 underline underline-offset-2"
          >
            Build your first outfit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {(outfits as Outfit[]).map(outfit => (
            <Link key={outfit.id} href={`/outfits/${outfit.id}`}>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <OutfitCard outfit={outfit} size="sm" />
                <div className="px-3 pb-3">
                  {outfit.name && (
                    <p className="text-xs font-medium text-gray-700 truncate">{outfit.name}</p>
                  )}
                  {outfit.notes && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{outfit.notes}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">
                    {outfit.slots?.filter(s => s.wishlist_item_id).length ?? 0} items
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
