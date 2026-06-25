import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OutfitCard from '@/components/OutfitCard'
import { CATEGORY_LABELS, SLOT_DISPLAY_ORDER } from '@/lib/constants'
import type { Outfit, OutfitSlot } from '@/lib/types'
import DeleteOutfitButton from './DeleteOutfitButton'
import { resolveOutfitSlotImages } from '@/lib/resolve-images'

export default async function OutfitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawOutfit, error } = await supabase
    .from('outfits')
    .select('*, slots:outfit_slots(*, wishlist_item:wishlist_items(*))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !rawOutfit) notFound()

  const outfit = await resolveOutfitSlotImages(supabase, rawOutfit as Outfit)

  const filledSlots = ((outfit as Outfit).slots ?? [])
    .filter((s: OutfitSlot) => s.wishlist_item)
    .sort((a: OutfitSlot, b: OutfitSlot) =>
      SLOT_DISPLAY_ORDER[a.slot_type] - SLOT_DISPLAY_ORDER[b.slot_type]
    )

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link href="/outfits" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
        ← Back to outfits
      </Link>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-6 sm:gap-8">
        {/* Left: outfit card */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <OutfitCard outfit={outfit as Outfit} size="lg" />
          </div>
        </div>

        {/* Right: details */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900">
                {outfit.name || 'Untitled outfit'}
              </h1>
              {outfit.notes && (
                <p className="text-sm text-gray-500 mt-1">{outfit.notes}</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href={`/outfit-builder/${outfit.id}`}
                className="px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit
              </Link>
              <DeleteOutfitButton outfitId={outfit.id} />
            </div>
          </div>

          {/* Items list */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Items ({filledSlots.length})
            </h2>
            <div className="space-y-3">
              {filledSlots.map((slot: OutfitSlot) => (
                <div key={slot.id} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                    {slot.wishlist_item?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slot.wishlist_item.image_url}
                        alt={slot.wishlist_item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200 text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {slot.wishlist_item?.product_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {CATEGORY_LABELS[slot.slot_type]}
                      {slot.wishlist_item?.brand ? ` · ${slot.wishlist_item.brand}` : ''}
                      {slot.wishlist_item?.price ? ` · $${slot.wishlist_item.price}` : ''}
                    </p>
                  </div>
                  {slot.wishlist_item?.product_url && (
                    <a
                      href={slot.wishlist_item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-700 whitespace-nowrap"
                    >
                      View ↗
                    </a>
                  )}
                </div>
              ))}

              {filledSlots.length === 0 && (
                <p className="text-sm text-gray-400">No items in this outfit.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
