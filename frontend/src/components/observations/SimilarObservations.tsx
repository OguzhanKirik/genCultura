'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { useSimilarObservations } from '@/lib/hooks/useObservations'
import { CategoryBadge } from './ObservationCard'

export function SimilarObservations({ observationId }: { observationId: string }) {
  const { data, isLoading } = useSimilarObservations(observationId)

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-700 mb-3">Similar observations</h2>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data?.length ? (
        <p className="text-sm text-gray-400">No similar observations yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map((obs) => (
            <Link key={obs.id} href={`/observations/${obs.id}`}>
              <div className="bg-white border border-gray-100 rounded-lg p-3 hover:border-brand-200 transition-all">
                {obs.category && (
                  <div className="mb-1.5">
                    <CategoryBadge category={obs.category} />
                  </div>
                )}
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{obs.body}</p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {formatDistanceToNow(new Date(obs.observed_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
