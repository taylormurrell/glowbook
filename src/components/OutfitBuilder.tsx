'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, Outfit, SlotType, WishlistItem } from '@/lib/types'
import { CATEGORIES, CATEGORY_LABELS, SLOT_DISPLAY_ORDER } from '@/lib/constants'
import OutfitCard from './OutfitCard'
import ItemPicker from './ItemPicker'

interface SlotState {
  slot_type: SlotType
  wishlist_item_id: string | null
  wishlist_item: WishlistItem | null
  display_order: number
}

function buildInitialSlots(existingOutfit?: Outfit): SlotState[] {
  return CATEGORIES.map((cat, i) => {
    const existing = existingOutfit?.slots?.find(s => s.slot_type === cat)
    return {
      slot_type: cat,
      wishlist_item_id: existing?.wishlist_item_id ?? null,
      wishlist_item: existing?.wishlist_item ?? null,
      display_order: SLOT_DISPLAY_ORDER[cat] ?? i,
    }
  })
}

interface Props {
  wishlistItems: WishlistItem[]
  existingOutfit?: Outfit
}

export default function OutfitBuilder({ wishlistItems, existingOutfit }: Props) {
  const router = useRouter()
  const [name, setName] = useState(existingOutfit?.name ?? '')
  const [notes, setNotes] = useState(existingOutfit?.notes ?? '')
  const [slots, setSlots] = useState<SlotState[]>(buildInitialSlots(existingOutfit))
  const [pickerSlot, setPickerSlot] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewOutfit: Outfit = {
    id: existingOutfit?.id ?? 'preview',
    user_id: '',
    name,
    notes: notes || null,
    created_at: '',
    updated_at: '',
    slots: slots.map(s => ({
      id: s.slot_type,
      outfit_id: '',
      slot_type: s.slot_type,
      wishlist_item_id: s.wishlist_item_id,
      display_order: s.display_order,
      created_at: '',
      updated_at: '',
      wishlist_item: s.wishlist_item,
    })),
  }

  function selectItem(slotType: SlotType, item: WishlistItem | null) {
    setSlots(prev => prev.map(s =>
      s.slot_type === slotType
        ? { ...s, wishlist_item_id: item?.id ?? null, wishlist_item: item }
        : s
    ))
  }

  async function save() {
    if (!name.trim()) {
      setError('Give your outfit a name.')
      return
    }
    setError(null)
    setSaving(true)

    const payload = {
      name: name.trim(),
      notes: notes.trim() || null,
      slots: slots
        .filter(s => s.wishlist_item_id)
        .map(s => ({
          slot_type: s.slot_type,
          wishlist_item_id: s.wishlist_item_id,
          display_order: s.display_order,
        })),
    }

    const url = existingOutfit ? `/api/outfits/${existingOutfit.id}` : '/api/outfits'
    const method = existingOutfit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save outfit')
      return
    }

    const saved = await res.json()
    router.push(`/outfits/${saved.id}`)
    router.refresh()
  }

  const activePickerSlot = pickerSlot ? slots.find(s => s.slot_type === pickerSlot) : null

  return (
    <div className="grid grid-cols-[1fr_280px] gap-8">
      {/* Left: form */}
      <div className="space-y-6">
        {/* Name + notes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Outfit name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Sunday errands, date night…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Occasion, season, mood…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
        </div>

        {/* Slots */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Items</h2>
          <div className="space-y-2">
            {slots
              .sort((a, b) => a.display_order - b.display_order)
              .map(slot => (
                <div
                  key={slot.slot_type}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    {slot.wishlist_item?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slot.wishlist_item.image_url}
                        alt={slot.wishlist_item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200 text-xs">
                        —
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500">{CATEGORY_LABELS[slot.slot_type]}</p>
                    <p className="text-sm text-gray-900 truncate mt-0.5">
                      {slot.wishlist_item?.product_name ?? (
                        <span className="text-gray-300">Empty</span>
                      )}
                    </p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => setPickerSlot(slot.slot_type)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                  >
                    {slot.wishlist_item ? 'Change' : 'Add'}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : existingOutfit ? 'Save changes' : 'Save outfit'}
          </button>
        </div>
      </div>

      {/* Right: live preview */}
      <div className="sticky top-20">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <OutfitCard outfit={previewOutfit} size="lg" />
          {name && (
            <div className="px-4 pb-4">
              <p className="text-sm font-medium text-gray-700">{name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Item picker modal */}
      {pickerSlot && activePickerSlot && (
        <ItemPicker
          items={wishlistItems}
          category={pickerSlot}
          selectedId={activePickerSlot.wishlist_item_id}
          onSelect={item => selectItem(pickerSlot, item)}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  )
}
