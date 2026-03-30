'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useObservations } from '@/lib/hooks/useObservations'
import { ObservationCard } from '@/components/observations/ObservationCard'
import type { Category } from '@/types'

const CATEGORIES: Category[] = ['pest', 'disease', 'nutrition', 'environment', 'general']

export default function ObservationsPage() {
  const [category, setCategory] = useState<Category | ''>('')
  const [cropType, setCropType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useObservations({
    page,
    page_size: 20,
    category: category || undefined,
    crop_type: cropType || undefined,
  })

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Observations</h1>
          {data && (
            <p className="text-sm text-gray-500">{data.total} recorded</p>
          )}
        </div>
        <Link
          href="/observations/new"
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} />
          New observation
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value as Category | ''); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by crop..."
          value={cropType}
          onChange={(e) => { setCropType(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-2">No observations yet</p>
          <Link href="/observations/new" className="text-brand-600 text-sm hover:underline">
            Record your first observation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((obs) => (
            <ObservationCard key={obs.id} observation={obs} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page} / {data.pages}
          </span>
          <button
            disabled={page === data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
