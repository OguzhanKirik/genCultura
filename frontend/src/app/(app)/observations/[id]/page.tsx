'use client'

import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Thermometer, Droplets, Wind, Sun, Loader2, Sparkles, RefreshCw, Bot } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useObservation, useDeleteObservation } from '@/lib/hooks/useObservations'
import { SimilarObservations } from '@/components/observations/SimilarObservations'
import { CategoryBadge } from '@/components/observations/ObservationCard'
import { mediaUrl } from '@/lib/api/media'
import { enrichObservation } from '@/lib/api/observations'
import { startRobotMission, getRobotMission, RobotMission } from '@/lib/api/robot'
import { useQueryClient } from '@tanstack/react-query'

export default function ObservationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: obs, isLoading } = useObservation(id)
  const { mutate: deleteObs, isPending: deleting } = useDeleteObservation()
  const [enriching, setEnriching] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)

  // Robot mission state
  const [robotMission, setRobotMission] = useState<RobotMission | null>(null)
  const [robotError, setRobotError] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<string>('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll mission status every 3 s while active
  useEffect(() => {
    if (!robotMission) return
    if (robotMission.status === 'done' || robotMission.status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current)
      if (robotMission.status === 'done') {
        queryClient.invalidateQueries({ queryKey: ['observations', id] })
      }
      return
    }
    pollRef.current = setInterval(async () => {
      try {
        const updated = await getRobotMission(robotMission.id)
        setRobotMission(updated)
      } catch {
        // ignore transient errors
      }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [robotMission?.id, robotMission?.status])

  async function handleSendRobot() {
    const zone = selectedZone || obs?.zone_id || ''
    if (!zone) return
    setRobotError(null)
    setRobotMission(null)
    try {
      const { mission_id } = await startRobotMission(id, zone)
      const mission = await getRobotMission(mission_id)
      setRobotMission(mission)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Could not reach robot bridge'
      setRobotError(msg)
    }
  }

  async function handleEnrich() {
    setEnriching(true)
    setEnrichError(null)
    try {
      await enrichObservation(id)
      queryClient.invalidateQueries({ queryKey: ['observations', id] })
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Analysis failed — is the Colab notebook still running?'
      setEnrichError(msg)
    } finally {
      setEnriching(false)
    }
  }

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

          {/* AI Analysis */}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
                <Sparkles size={13} />
                AI Analysis
              </div>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={11} className={enriching ? 'animate-spin' : ''} />
                {enriching ? 'Analysing…' : obs.body_enriched ? 'Re-analyse' : 'Analyse'}
              </button>
            </div>
            {enrichError && (
              <p className="text-xs text-red-500 mb-2">{enrichError}</p>
            )}
            {obs.body_enriched ? (
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {obs.body_enriched}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                {enriching ? 'Running analysis…' : 'No analysis yet — tap Analyse to run the VLM.'}
              </p>
            )}
          </div>

          {/* Robot mission */}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
              <Bot size={13} />
              Robot Capture
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={obs.zone_id ? `Zone: ${obs.zone_id}` : 'Zone (e.g. Bay 1A)'}
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-400"
              />
              <button
                onClick={handleSendRobot}
                disabled={
                  (!selectedZone && !obs.zone_id) ||
                  (!!robotMission && robotMission.status !== 'done' && robotMission.status !== 'failed')
                }
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors shrink-0"
              >
                <Bot size={11} />
                {robotMission && robotMission.status !== 'done' && robotMission.status !== 'failed'
                  ? 'Running…'
                  : 'Send Robot'}
              </button>
            </div>
            {robotError && (
              <p className="text-xs text-red-500 mt-1">{robotError}</p>
            )}
            {robotMission && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
                robotMission.status === 'done'   ? 'bg-green-50 text-green-700 border border-green-100' :
                robotMission.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
                'bg-blue-50 text-blue-700 border border-blue-100'
              }`}>
                {robotMission.status !== 'done' && robotMission.status !== 'failed' && (
                  <Loader2 size={11} className="animate-spin shrink-0" />
                )}
                <span className="capitalize font-medium mr-1">{robotMission.status.replace('_', ' ')}</span>
                {robotMission.message}
                {robotMission.status === 'done' && robotMission.image_count > 0 && (
                  <span className="ml-auto font-medium">{robotMission.image_count} photo{robotMission.image_count > 1 ? 's' : ''} added</span>
                )}
              </div>
            )}
          </div>

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
              <p className="text-xs font-medium text-gray-500 mb-3">Attachments</p>

              {/* Images grid */}
              {(() => {
                const images = obs.media_attachments.filter(m => m.media_type === 'image')
                const others = obs.media_attachments.filter(m => m.media_type !== 'image')
                return (
                  <>
                    {images.length > 0 && (
                      <div className={`grid gap-2 mb-3 ${
                        images.length === 1 ? 'grid-cols-1' :
                        images.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2'
                      }`}>
                        {images.map((m, i) => (
                          <a key={m.id} href={mediaUrl(m.storage_path)} target="_blank" rel="noreferrer"
                            className={images.length === 3 && i === 0 ? 'col-span-2' : ''}>
                            <img
                              src={mediaUrl(m.storage_path)}
                              alt={m.original_name || 'photo'}
                              className="w-full rounded-lg border border-gray-100 object-cover"
                              style={{ maxHeight: images.length === 1 ? '400px' : '200px' }}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {others.map((m) => (
                      <div key={m.id} className="mb-2">
                        {m.media_type === 'video' && (
                          <video src={mediaUrl(m.storage_path)} controls
                            className="w-full rounded-lg border border-gray-100 max-h-64"
                          />
                        )}
                        {m.media_type === 'audio' && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <audio controls src={mediaUrl(m.storage_path)} className="w-full" />
                            {m.transcription && (
                              <p className="text-xs text-gray-500 mt-1">{m.transcription}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )
              })()}
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
