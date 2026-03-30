'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, ImagePlus, Video, X } from 'lucide-react'
import type { ObservationCreate, Category, GrowthStage } from '@/types'

const CATEGORIES: Category[] = ['pest', 'disease', 'nutrition', 'environment', 'general']
const GROWTH_STAGES: GrowthStage[] = ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest']

interface SelectedFile {
  file: File
  preview: string
  mediaType: 'image' | 'video'
}

interface Props {
  defaultValues?: Partial<ObservationCreate>
  onSubmit: (data: ObservationCreate, files: SelectedFile[]) => Promise<void>
  isSubmitting: boolean
}

export type { SelectedFile }

export function ObservationForm({ defaultValues, onSubmit, isSubmitting }: Props) {
  const [body, setBody] = useState(defaultValues?.body ?? '')
  const [cropType, setCropType] = useState(defaultValues?.crop_type ?? '')
  const [growthStage, setGrowthStage] = useState<GrowthStage | ''>(defaultValues?.growth_stage ?? '')
  const [zoneId, setZoneId] = useState(defaultValues?.zone_id ?? '')
  const [category, setCategory] = useState<Category | ''>(defaultValues?.category ?? '')
  const [severity, setSeverity] = useState<number>(defaultValues?.severity ?? 0)
  const [tempC, setTempC] = useState(defaultValues?.temp_c?.toString() ?? '')
  const [humidityPct, setHumidityPct] = useState(defaultValues?.humidity_pct?.toString() ?? '')
  const [co2Ppm, setCo2Ppm] = useState(defaultValues?.co2_ppm?.toString() ?? '')
  const [lightKlux, setLightKlux] = useState(defaultValues?.light_klux?.toString() ?? '')
  const [showEnv, setShowEnv] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])

  // Voice-to-text via browser SpeechRecognition (Chrome/Edge)
  const [recording, setRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<any>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const canRecord = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition)

  function startRecording() {
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (e: any) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (final) setBody((prev) => (prev ? prev + ' ' : '') + final)
      setInterimText(interim)
    }

    recognition.onerror = () => { setRecording(false); setInterimText('') }
    recognition.onend = () => { setRecording(false); setInterimText('') }

    recognition.start()
    recognitionRef.current = recognition
    setRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setRecording(false)
    setInterimText('')
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video') {
    const files = Array.from(e.target.files ?? [])
    const newFiles: SelectedFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      mediaType,
    }))
    setSelectedFiles((prev) => [...prev, ...newFiles])
    e.target.value = ''
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(
      {
        body: body.trim(),
        crop_type: cropType || undefined,
        growth_stage: (growthStage as GrowthStage) || undefined,
        zone_id: zoneId || undefined,
        category: (category as Category) || undefined,
        severity: severity || undefined,
        temp_c: tempC ? parseFloat(tempC) : undefined,
        humidity_pct: humidityPct ? parseFloat(humidityPct) : undefined,
        co2_ppm: co2Ppm ? parseInt(co2Ppm) : undefined,
        light_klux: lightKlux ? parseFloat(lightKlux) : undefined,
      },
      selectedFiles
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700">What did you observe?</label>
          {canRecord && (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                recording
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {recording ? <><MicOff size={12} /> Stop</> : <><Mic size={12} /> Voice</>}
            </button>
          )}
        </div>
        <textarea
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe what you saw — be specific. e.g. 'Leaves on tray 7 are cupping inward and showing bronze speckling on outer thirds. First noticed yesterday. Temperature has been high since the weekend.'"
          className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none leading-relaxed ${
            recording ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
          }`}
        />
        {interimText && (
          <p className="mt-1 text-sm text-gray-400 italic">{interimText}…</p>
        )}
        {recording && !interimText && (
          <p className="mt-1 text-xs text-red-400">Listening…</p>
        )}
      </div>

      {/* Media attachments */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Photos &amp; video</label>

        {/* Previews */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedFiles.map((f, i) => (
              <div key={i} className="relative group">
                {f.mediaType === 'image' ? (
                  <img
                    src={f.preview}
                    alt=""
                    className="h-20 w-20 object-cover rounded-lg border border-gray-100"
                  />
                ) : (
                  <video
                    src={f.preview}
                    className="h-20 w-20 object-cover rounded-lg border border-gray-100"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
                <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">
                  {f.mediaType === 'video' ? '▶' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Upload buttons */}
        <div className="flex gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'video')}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ImagePlus size={13} /> Add photos
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Video size={13} /> Add video
          </button>
        </div>
      </div>

      {/* Structured tags */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Select —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Crop type</label>
          <input
            type="text"
            value={cropType}
            onChange={(e) => setCropType(e.target.value)}
            placeholder="e.g. tomato"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Growth stage</label>
          <select
            value={growthStage}
            onChange={(e) => setGrowthStage(e.target.value as GrowthStage | '')}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Select —</option>
            {GROWTH_STAGES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Zone / bay</label>
          <input
            type="text"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            placeholder="e.g. Bay 3A"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Severity</label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSeverity(n === severity ? 0 : n)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                n === 0 ? 'hidden' :
                severity >= n
                  ? 'bg-orange-400 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
          {severity > 0 && (
            <button
              type="button"
              onClick={() => setSeverity(0)}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Environmental snapshot */}
      <div>
        <button
          type="button"
          onClick={() => setShowEnv((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          {showEnv ? '▾' : '▸'} Environmental snapshot (optional)
        </button>
        {showEnv && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: 'Temp (°C)', value: tempC, set: setTempC, placeholder: '24.5' },
              { label: 'Humidity (%)', value: humidityPct, set: setHumidityPct, placeholder: '72' },
              { label: 'CO₂ (ppm)', value: co2Ppm, set: setCo2Ppm, placeholder: '850' },
              { label: 'Light (klux)', value: lightKlux, set: setLightKlux, placeholder: '12.3' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => history.back()}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !body.trim()}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Save observation
        </button>
      </div>
    </form>
  )
}
