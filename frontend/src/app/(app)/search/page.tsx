'use client'

import { useState, useCallback } from 'react'
import { useSearch } from '@/lib/hooks/useSearch'
import { ObservationCard } from '@/components/observations/ObservationCard'

const EXAMPLE_QUERIES = [
  "leaves curling upward during high temperatures",
  "spider mite outbreak in tomato fruiting stage",
  "humidity drop causing tip burn",
  "nitrogen deficiency in seedlings",
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const handleChange = useCallback((value: string) => {
    setQuery(value)
    clearTimeout((window as any)._searchTimeout)
    ;(window as any)._searchTimeout = setTimeout(() => setDebouncedQuery(value), 400)
  }, [])

  const { data, isFetching } = useSearch({ q: debouncedQuery })

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Search knowledge base</h1>

      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="What did we observe last time CO2 dropped during flowering?"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white shadow-sm"
          autoFocus
        />
        {isFetching && (
          <div className="absolute right-3 top-3.5 h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        )}
      </div>

      {!debouncedQuery && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Try asking</p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleChange(q)}
                className="text-left text-sm text-gray-600 px-4 py-2 bg-white border border-gray-100 rounded-lg hover:border-brand-200 hover:text-brand-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {data && debouncedQuery && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {data.total} result{data.total !== 1 ? 's' : ''} &middot; {data.search_ms}ms
          </p>
          {data.results.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No matching observations found</p>
          ) : (
            <div className="space-y-3">
              {data.results.map(({ observation, similarity }) => (
                <div key={observation.id} className="relative">
                  <ObservationCard observation={observation} />
                  <span className="absolute top-3 right-3 text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                    {Math.round(similarity * 100)}% match
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
