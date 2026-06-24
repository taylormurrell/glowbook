'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Category, WishlistItem } from '@/lib/types'
import { CATEGORY_LABELS } from '@/lib/constants'
import WishlistItemCard from '@/components/WishlistItemCard'
import CategoryFilter from '@/components/CategoryFilter'
import AddItemModal from '@/components/AddItemModal'

export default function WishlistPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [showAdd, setShowAdd] = useState(searchParams.get('add') === '1')
  const [editItem, setEditItem] = useState<WishlistItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WishlistItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/items')
    const data = await res.json()
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/items')
      .then(res => res.json())
      .then(data => {
        if (!active) return
        setItems(data ?? [])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  const counts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {} as Partial<Record<Category, number>>)

  const filtered = items.filter(item => {
    if (category && item.category !== category) return false
    if (search && !item.product_name.toLowerCase().includes(search.toLowerCase()) &&
        !(item.brand ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Wishlist</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          + Add item
        </button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search items…"
          className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        />
        <CategoryFilter selected={category} onChange={setCategory} counts={counts} />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm">
            {items.length === 0
              ? 'Your wishlist is empty.'
              : `No items match${category ? ` in ${CATEGORY_LABELS[category]}` : ''}${search ? ` "${search}"` : ''}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(item => (
            <WishlistItemCard
              key={item.id}
              item={item}
              onEdit={setEditItem}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddItemModal
          onClose={() => { setShowAdd(false); router.replace('/wishlist') }}
          onSaved={load}
        />
      )}

      {/* Edit modal */}
      {editItem && (
        <AddItemModal
          editItem={editItem}
          onClose={() => setEditItem(null)}
          onSaved={load}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete item?</h3>
            <p className="text-sm text-gray-500 mb-1">
              <strong>{deleteTarget.product_name}</strong> will be removed from your wishlist.
            </p>
            <p className="text-xs text-gray-400 mb-5">
              It will also be removed from any outfits it appears in.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
