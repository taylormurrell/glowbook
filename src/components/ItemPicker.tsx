'use client'

import { useState } from 'react'
import type { Category, WishlistItem } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/constants'

interface Props {
  items: WishlistItem[]
  category: Category
  selectedId: string | null
  onSelect: (item: WishlistItem | null) => void
  onClose: () => void
}

export default function ItemPicker({ items, category, selectedId, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const filtered = items
    .filter(i => i.category === category)
    .filter(i =>
      !search ||
      i.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (i.brand ?? '').toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Pick {CATEGORY_LABELS[category]}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {selectedId && (
            <button
              onClick={() => { onSelect(null); onClose() }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              Remove from slot
            </button>
          )}

          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-400 text-center">
              No {CATEGORY_LABELS[category]} items in your wishlist
            </p>
          )}

          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => { onSelect(item); onClose() }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                item.id === selectedId
                  ? 'bg-gray-900 text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${item.id === selectedId ? 'text-white' : 'text-gray-900'}`}>
                  {item.product_name}
                </p>
                {item.brand && (
                  <p className={`text-xs truncate ${item.id === selectedId ? 'text-gray-300' : 'text-gray-400'}`}>
                    {item.brand}
                  </p>
                )}
              </div>
              {item.id === selectedId && (
                <span className="ml-auto text-xs text-gray-300">Selected</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
