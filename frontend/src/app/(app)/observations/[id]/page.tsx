'use client'

import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Thermometer, Droplets, Wind, Sun, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useObservation, useDeleteObservation } from '@/lib/hooks/useObservations'
import { SimilarObservations } from '@/components/observations/SimilarObservations'
import { CategoryBadge } from '@/components/observations/ObservationCard'
import { mediaUrl } from '@/lib/api/media'

export default function ObservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: obs, isLoading } = useObservation(id)
  const { mutate: deleteObs, isPending: deleting } = useDeleteObservation()

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!obs) return <p className="text-gray-500">Observation not found.</p>

  function handleDelete() {
    if (!confirm('Delete this observation?')) return
    deleteObs(id, { onSuccess: () => router.push('/observations') })
  }

  return (
    <div className="max-w-4xl mx-auto flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <Link href="/observations" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {obs.category && <CategoryBadge category={obs.category} />}
              {obs.crop_type && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {obs.crop_type}
                </span>
              )}
              {obs.growth_stage && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {obs.growth_stage}
                </span>
              )}
              {obs.zone_id && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  Zone: {obs.zone_id}
                </span>
              )}
              {obs.severity && (
                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                  Severity {obs.severity}/5
                </span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/observations/${id}/edit`}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{obs.body}</p>

          {/* Environmental snapshot */}
          {(obs.temp_c || obs.humidity_pct || obs.co2_ppm || obs.light_klux) && (
            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-4">
              {obs.temp_c && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Thermometer size={14} /> {obs.temp_c}°C
                </div>
              )}
              {obs.humidity_pct && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Droplets size={14} /> {obs.humidity_pct}% RH
                </div>
              )}
              {obs.co2_ppm && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Wind size={14} /> {obs.co2_ppm} ppm CO₂
                </div>
              )}
              {obs.light_klux && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Sun size={14} /> {obs.light_klux} klux
                </div>
              )}
            </div>
          )}

          {/* Media */}
          {obs.media_attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {obs.media_attachments.map((m) => (
                  <div key={m.id}>
                    {m.media_type === 'image' ? (
                      <img
                        src={mediaUrl(m.storage_path)}
                        alt={m.original_name || 'attachment'}
                        className="h-24 w-24 object-cover rounded-lg border border-gray-100"
                      />
                    ) : m.media_type === 'video' ? (
                      <video
                        src={mediaUrl(m.storage_path)}
                        controls
                        className="h-24 rounded-lg border border-gray-100"
                      />
                    ) : m.media_type === 'audio' ? (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <audio controls src={mediaUrl(m.storage_path)} className="h-8" />
                        {m.transcription && (
                          <p className="text-xs text-gray-500 mt-1 max-w-xs">{m.transcription}</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
            <span>By {obs.author.full_name}</span>
            <span>{format(new Date(obs.observed_at), 'PPpp')}</span>
          </div>
        </div>
      </div>

      {/* Similar observations sidebar */}
      <div className="w-72 shrink-0">
        <SimilarObservations observationId={id} />
      </div>
    </div>
  )
}
