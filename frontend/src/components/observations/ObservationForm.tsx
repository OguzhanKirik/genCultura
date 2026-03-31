'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, ImagePlus, Video, X } from 'lucide-react'
import type { ObservationCreate, Category, GrowthStage } from '@/types'

const CATEGORIES: Category[] = ['pest', 'disease', 'nutrition', 'environment', 'general']
const GROWTH_STAGES: GrowthStage[] = ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest']

interface SelectedFile {
  file: File
  preview: string
  mediaType: 'image' | 'video' | 'audio'
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

  // Voice-to-text (SpeechRecognition → populates text field)
  const [voiceActive, setVoiceActive] = useState(false)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<any>(null)
  const voiceActiveRef = useRef(false)       // ref copy — readable inside callbacks
  const bodyBeforeVoiceRef = useRef('')      // body snapshot when recording starts
  const accumulatedRef = useRef('')          // confirmed text across restarts
  const sessionFinalRef = useRef('')         // final text in current session

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const canVoiceType = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  function buildBody(sessionFinal: string) {
    const parts = [bodyBeforeVoiceRef.current, accumulatedRef.current, sessionFinal].filter(Boolean)
    return parts.join(' ')
  }

  function startRecognitionSession() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false   // single-shot is more reliable on mobile
    recognition.interimResults = true
    recognition.lang = 'en-US'

    sessionFinalRef.current = ''

    recognition.onresult = (e: any) => {
      let sessionFinal = '', interim = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) sessionFinal += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      // Only update if final text changed — prevents duplicate fires
      if (sessionFinal && sessionFinal !== sessionFinalRef.current) {
        sessionFinalRef.current = sessionFinal
        setBody(buildBody(sessionFinal))
      }
      setInterimText(interim)
    }

    recognition.onerror = () => setInterimText('')

    recognition.onend = () => {
      // Commit this session's text into accumulated, then restart if still active
      if (sessionFinalRef.current) {
        const parts = [accumulatedRef.current, sessionFinalRef.current].filter(Boolean)
        accumulatedRef.current = parts.join(' ')
        sessionFinalRef.current = ''
      }
      setInterimText('')
      if (voiceActiveRef.current) {
        startRecognitionSession()  // keep listening
      } else {
        setVoiceActive(false)
      }
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  function startVoice() {
    bodyBeforeVoiceRef.current = body
    accumulatedRef.current = ''
    sessionFinalRef.current = ''
    voiceActiveRef.current = true
    setVoiceActive(true)
    startRecognitionSession()
  }

  function stopVoice() {
    voiceActiveRef.current = false
    recognitionRef.current?.stop()
    setVoiceActive(false)
    setInterimText('')
  }

  // ── File selection (image / video) ────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video' | 'audio') {
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

  // ── Submit ─────────────────────────────────────────────────────────────────

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
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 space-y-5">

      {/* Body */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-700">What did you observe?</label>
          {canVoiceType && (
            <button
              type="button"
              onClick={voiceActive ? stopVoice : startVoice}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                voiceActive
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {voiceActive ? <><MicOff size={12} /> Stop</> : <><Mic size={12} /> Voice</>}
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
            voiceActive ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
          }`}
        />
        {interimText && <p className="mt-1 text-sm text-gray-400 italic">{interimText}…</p>}
        {voiceActive && !interimText && <p className="mt-1 text-xs text-red-400">Listening…</p>}
      </div>

      {/* Media attachments */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Photos, video &amp; audio</label>

        {/* Previews */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedFiles.map((f, i) => (
              <div key={i} className="relative group">
                {f.mediaType === 'image' && (
                  <img
                    src={f.preview}
                    alt=""
                    className="h-20 w-20 object-cover rounded-lg border border-gray-100"
                  />
                )}
                {f.mediaType === 'video' && (
                  <video
                    src={f.preview}
                    className="h-20 w-20 object-cover rounded-lg border border-gray-100"
                  />
                )}
                {f.mediaType === 'audio' && (
                  <div className="h-20 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center px-3 gap-1">
                    <Mic size={18} className="text-brand-500" />
                    <audio src={f.preview} controls className="w-28 h-6" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Capture buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Hidden file inputs — capture="environment" opens rear camera on mobile */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'video')}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <ImagePlus size={14} /> Photo
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Video size={14} /> Video
          </button>

        </div>
      </div>

      {/* Structured tags */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | '')}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Growth stage</label>
          <select
            value={growthStage}
            onChange={(e) => setGrowthStage(e.target.value as GrowthStage | '')}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
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
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !body.trim()}
          className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Save observation
        </button>
      </div>
    </form>
  )
}
