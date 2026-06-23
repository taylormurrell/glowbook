'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteOutfitButton({ outfitId }: { outfitId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/outfits/${outfitId}`, { method: 'DELETE' })
    router.push('/outfits')
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Confirm delete'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-4 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  )
}
