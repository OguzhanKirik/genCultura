import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'
import type { ObservationSummary, Category } from '@/types'

const CATEGORY_COLORS: Record<Category, string> = {
  pest:        'bg-red-50 text-red-700',
  disease:     'bg-orange-50 text-orange-700',
  nutrition:   'bg-yellow-50 text-yellow-700',
  environment: 'bg-blue-50 text-blue-700',
  general:     'bg-gray-100 text-gray-600',
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_COLORS[category])}>
      {category}
    </span>
  )
}

export function ObservationCard({ observation: obs }: { observation: ObservationSummary }) {
  return (
    <Link href={`/observations/${obs.id}`}>
      <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-brand-200 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap gap-1.5">
            {obs.category && <CategoryBadge category={obs.category} />}
            {obs.crop_type && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {obs.crop_type}
              </span>
            )}
            {obs.zone_id && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {obs.zone_id}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {formatDistanceToNow(new Date(obs.observed_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">{obs.body}</p>
        {obs.needs_embedding && (
          <p className="mt-2 text-xs text-gray-400">Indexing for search...</p>
        )}
      </div>
    </Link>
  )
}
