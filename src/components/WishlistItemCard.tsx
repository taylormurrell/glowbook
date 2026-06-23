'use client'

import type { WishlistItem } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/constants'

interface Props {
  item: WishlistItem
  onEdit: (item: WishlistItem) => void
  onDelete: (item: WishlistItem) => void
}

export default function WishlistItemCard({ item, onEdit, onDelete }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.product_name}
            className="w-full h-full object-cover"
            onError={e => {
              const t = e.target as HTMLImageElement
              t.style.display = 'none'
              t.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        <div className={`absolute inset-0 flex items-center justify-center text-gray-300 text-sm ${item.image_url ? 'hidden' : ''}`}>
          No image
        </div>

        {/* Hover actions — desktop only */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors hidden sm:flex items-end justify-end opacity-0 group-hover:opacity-100 p-2 gap-1.5">
          <button
            onClick={() => onEdit(item)}
            className="px-2 py-1 bg-white rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            className="px-2 py-1 bg-white rounded-md text-xs font-medium text-red-600 hover:bg-red-50 shadow-sm"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
            {(item.brand || item.retailer) && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {item.brand ?? item.retailer}
              </p>
            )}
          </div>
          {item.price && (
            <span className="text-xs font-medium text-gray-600 whitespace-nowrap">${item.price}</span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {CATEGORY_LABELS[item.category]}
          </span>
          <a
            href={item.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            View ↗
          </a>
        </div>

        {/* Touch actions — mobile only */}
        <div className="flex gap-2 mt-2.5 sm:hidden">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            className="flex-1 py-2 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
