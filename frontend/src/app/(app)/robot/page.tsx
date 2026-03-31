'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createObservation } from '@/lib/api/observations'
import { startRobotMission, getRobotMission, getRobotZones, RobotMission } from '@/lib/api/robot'

export default function SendObserverPage() {
  const router = useRouter()

  const [zones, setZones] = useState<string[]>([])
  const [zone, setZone] = useState('')
  const [notes, setNotes] = useState('')
  const [cropType, setCropType] = useState('')
  useEffect(() => {
    getRobotZones().then(setZones).catch(() => setZones(['Bay 1A', 'Bay 1B', 'Bay 2A', 'Bay 2B']))
  }, [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mission, setMission] = useState<RobotMission | null>(null)
  const [obsId, setObsId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!zone.trim()) return
    setLoading(true)
    setError(null)

    try {
      // 1. Create a placeholder observation so images have somewhere to land
      const obs = await createObservation({
        body: notes.trim() || `Robot observation — ${zone}`,
        zone_id: zone.trim(),
        crop_type: cropType.trim() || undefined,
      })
      setObsId(obs.id)

      // 2. Dispatch the robot
      const { mission_id } = await startRobotMission(obs.id, zone.trim())
      const m = await getRobotMission(mission_id)
      setMission(m)

      // 3. Poll until done / failed
      const interval = setInterval(async () => {
        try {
          const updated = await getRobotMission(mission_id)
          setMission(updated)
          if (updated.status === 'done' || updated.status === 'failed') {
            clearInterval(interval)
            setLoading(false)
            if (updated.status === 'done') {
              router.push(`/observations/${obs.id}`)
            }
          }
        } catch {
          // ignore transient errors
        }
      }, 3000)
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Failed — is the robot bridge running?'
      setError(msg)
      setLoading(false)
    }
  }

  const statusColor =
    mission?.status === 'done'   ? 'bg-green-50 text-green-700 border-green-100' :
    mission?.status === 'failed' ? 'bg-red-50 text-red-700 border-red-100' :
                                   'bg-blue-50 text-blue-700 border-blue-100'

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/observations" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bot size={20} className="text-gray-700" />
          <h1 className="text-lg font-semibold text-gray-900">Send Observer Robot</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Zone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Zone / bay <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {zones.map(z => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZone(z)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    zone === z
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={zone}
              onChange={e => setZone(e.target.value)}
              placeholder="Or type a custom zone…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Crop type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Crop type (optional)</label>
            <input
              type="text"
              value={cropType}
              onChange={e => setCropType(e.target.value)}
              placeholder="e.g. Tomato, Pepper…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What should the robot look for? Any context for the AI analysis…"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Mission status */}
          {mission && (
            <div className={`text-xs px-3 py-2.5 rounded-lg border flex items-center gap-2 ${statusColor}`}>
              {mission.status !== 'done' && mission.status !== 'failed' && (
                <Loader2 size={12} className="animate-spin shrink-0" />
              )}
              <div>
                <span className="font-medium capitalize">{mission.status.replace('_', ' ')}</span>
                <span className="ml-1.5">{mission.message}</span>
                {mission.status === 'done' && mission.image_count > 0 && (
                  <span className="ml-1.5 font-medium">
                    — {mission.image_count} photo{mission.image_count > 1 ? 's' : ''} captured
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!zone.trim() || loading}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
            {loading ? 'Robot en route…' : 'Send Robot'}
          </button>

          {obsId && mission?.status !== 'done' && (
            <p className="text-center text-xs text-gray-400">
              Observation created —{' '}
              <Link href={`/observations/${obsId}`} className="text-brand-600 hover:underline">
                view it
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
