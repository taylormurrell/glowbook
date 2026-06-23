'use client'

import type { Category } from '@/lib/types'
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/constants'

interface Props {
  selected: Category | null
  onChange: (category: Category | null) => void
  counts?: Partial<Record<Category, number>>
}

export default function CategoryFilter({ selected, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
          selected === null
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        All {counts && Object.values(counts).reduce((a, b) => a + b, 0) > 0
          ? `(${Object.values(counts).reduce((a, b) => a + b, 0)})`
          : ''}
      </button>

      {CATEGORIES.map(cat => {
        const count = counts?.[cat] ?? 0
        if (count === 0 && selected !== cat) return null
        return (
          <button
            key={cat}
            onClick={() => onChange(cat === selected ? null : cat)}
            className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              selected === cat
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {CATEGORY_LABELS[cat]} {counts && count > 0 ? `(${count})` : ''}
          </button>
        )
      })}
    </div>
  )
}
