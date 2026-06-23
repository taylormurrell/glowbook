'use client'

import type { Outfit, SlotType, WishlistItem } from '@/lib/types'
import { SLOT_DISPLAY_ORDER } from '@/lib/constants'

interface Props {
  outfit: Outfit
  size?: 'sm' | 'lg'
}

function ItemThumb({ item, size, tall }: { item: WishlistItem; size: number; tall?: boolean }) {
  return (
    <div
      style={{ width: size, height: tall ? Math.round(size * 1.5) : size }}
      className="flex-shrink-0 rounded-md overflow-hidden bg-gray-50 border border-gray-100"
    >
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.product_name}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-300 text-xs">?</span>
        </div>
      )}
    </div>
  )
}

export default function OutfitCard({ outfit, size = 'sm' }: Props) {
  const slots = outfit.slots ?? []

  const getItem = (type: SlotType): WishlistItem | null =>
    slots.find(s => s.slot_type === type && s.wishlist_item)?.wishlist_item ?? null

  const jewelry = getItem('jewelry')
  const outerwear = getItem('outerwear')
  const dress = getItem('dress')
  const top = getItem('top')
  const bottom = getItem('bottom')
  const bag = getItem('bag')
  const shoes = getItem('shoes')
  const other = getItem('other')

  const thumbSm = size === 'sm' ? 52 : 88
  const thumbMd = size === 'sm' ? 68 : 112
  const thumbLg = size === 'sm' ? 80 : 128

  const hasAny = [jewelry, outerwear, dress, top, bottom, bag, shoes, other].some(Boolean)

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-gray-300 text-xs">
        No items
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      {jewelry && (
        <div className="flex justify-center">
          <ItemThumb item={jewelry} size={thumbSm} />
        </div>
      )}

      {outerwear && (
        <div className="flex justify-center">
          <ItemThumb item={outerwear} size={thumbLg} />
        </div>
      )}

      {dress ? (
        <div className="flex justify-center">
          <ItemThumb item={dress} size={thumbLg} tall />
        </div>
      ) : (
        <>
          {top && (
            <div className="flex justify-center">
              <ItemThumb item={top} size={thumbMd} />
            </div>
          )}
          {bottom && (
            <div className="flex justify-center">
              <ItemThumb item={bottom} size={thumbMd} tall />
            </div>
          )}
        </>
      )}

      {(bag || shoes) && (
        <div className="flex justify-center gap-2">
          {bag && <ItemThumb item={bag} size={thumbSm} />}
          {shoes && <ItemThumb item={shoes} size={thumbSm} />}
        </div>
      )}

      {other && (
        <div className="flex justify-center">
          <ItemThumb item={other} size={thumbSm} />
        </div>
      )}
    </div>
  )
}

export { SLOT_DISPLAY_ORDER }
