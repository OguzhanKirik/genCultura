'use client'

import { useRouter } from 'next/navigation'
import { ObservationForm, type SelectedFile } from '@/components/observations/ObservationForm'
import { useCreateObservation } from '@/lib/hooks/useObservations'
import { uploadMedia, enrichObservation } from '@/lib/api/observations'
import type { ObservationCreate } from '@/types'

export default function NewObservationPage() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateObservation()

  async function handleSubmit(data: ObservationCreate, files: SelectedFile[]) {
    const obs = await mutateAsync(data)

    for (const { file, mediaType } of files) {
      await uploadMedia(obs.id, file, mediaType)
    }

    // Fire-and-forget enrichment — navigate immediately, analysis arrives in background
    enrichObservation(obs.id).catch(() => {/* LLM may not be configured yet */})

    router.push(`/observations/${obs.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">New observation</h1>
      <ObservationForm onSubmit={handleSubmit} isSubmitting={isPending} />
    </div>
  )
}
