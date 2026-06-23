'use client'

import { useState } from 'react'
import type { Category, ImageSource, WishlistItem } from '@/lib/types'
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/constants'
import ImageDropzone from './ImageDropzone'

interface Props {
  onClose: () => void
  onSaved: () => void
  editItem?: WishlistItem
}

const EMPTY = {
  product_url: '',
  product_name: '',
  brand: '',
  retailer: '',
  price: '',
  category: 'top' as Category,
  color: '',
  notes: '',
  image_url: '',
  image_source: 'none' as ImageSource,
}

export default function AddItemModal({ onClose, onSaved, editItem }: Props) {
  const [fields, setFields] = useState(
    editItem
      ? {
          product_url: editItem.product_url,
          product_name: editItem.product_name,
          brand: editItem.brand ?? '',
          retailer: editItem.retailer ?? '',
          price: editItem.price ?? '',
          category: editItem.category,
          color: editItem.color ?? '',
          notes: editItem.notes ?? '',
          image_url: editItem.image_url ?? '',
          image_source: editItem.image_source,
        }
      : EMPTY
  )
  const [scraping, setScraping] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setFields(f => ({ ...f, [key]: value }))
  }

  async function scrape() {
    if (!fields.product_url) return
    setScraping(true)
    setError(null)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fields.product_url }),
      })
      const data = await res.json()
      setFields(f => ({
        ...f,
        product_name: data.product_name || f.product_name,
        brand: data.brand || f.brand,
        retailer: data.retailer || f.retailer,
        price: data.price || f.price,
        image_url: data.image_url || f.image_url,
        image_source: data.image_url ? 'scraped_url' : f.image_source,
      }))
    } catch {
      setError('Could not fetch product details. Fill in manually.')
    }
    setScraping(false)
  }

  async function save() {
    if (!fields.product_name || !fields.category || !fields.product_url) {
      setError('Product URL, name, and category are required.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      product_url: fields.product_url,
      product_name: fields.product_name,
      brand: fields.brand || null,
      retailer: fields.retailer || null,
      price: fields.price || null,
      category: fields.category,
      color: fields.color || null,
      notes: fields.notes || null,
      image_url: fields.image_url || null,
      image_source: fields.image_source,
    }

    const url = editItem ? `/api/items/${editItem.id}` : '/api/items'
    const method = editItem ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to save item')
      return
    }

    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {editItem ? 'Edit item' : 'Add wishlist item'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 grid grid-cols-[1fr_200px] gap-6">
          {/* Left: fields */}
          <div className="space-y-4">
            {/* URL + Scrape */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Product URL *</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={fields.product_url}
                  onChange={e => set('product_url', e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button
                  onClick={scrape}
                  disabled={!fields.product_url || scraping}
                  className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
                >
                  {scraping ? 'Fetching…' : 'Fetch'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Product name *</label>
              <input
                type="text"
                value={fields.product_name}
                onChange={e => set('product_name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Category *</label>
              <select
                value={fields.category}
                onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Brand</label>
                <input
                  type="text"
                  value={fields.brand}
                  onChange={e => set('brand', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Retailer</label>
                <input
                  type="text"
                  value={fields.retailer}
                  onChange={e => set('retailer', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Price</label>
                <input
                  type="text"
                  value={fields.price}
                  onChange={e => set('price', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Color</label>
                <input
                  type="text"
                  value={fields.color}
                  onChange={e => set('color', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={fields.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>
          </div>

          {/* Right: image */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Image</label>
            <ImageDropzone
              currentUrl={fields.image_url || null}
              onUpload={(url, source) => setFields(f => ({ ...f, image_url: url, image_source: source }))}
            />
            {fields.image_url && (
              <button
                onClick={() => setFields(f => ({ ...f, image_url: '', image_source: 'none' }))}
                className="mt-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Remove image
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 px-3 py-2 bg-red-50 rounded-lg">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editItem ? 'Save changes' : 'Add to wishlist'}
          </button>
        </div>
      </div>
    </div>
  )
}
