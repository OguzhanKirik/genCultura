import { apiClient } from './client'
import type {
  ObservationCreate,
  ObservationDetail,
  ObservationSummary,
  PaginatedObservations,
  MediaAttachment,
} from '@/types'

export interface ListObservationsParams {
  page?: number
  page_size?: number
  crop_type?: string
  category?: string
  zone_id?: string
  author_id?: string
  date_from?: string
  date_to?: string
}

export async function listObservations(params: ListObservationsParams = {}): Promise<PaginatedObservations> {
  const { data } = await apiClient.get('/observations', { params })
  return data
}

export async function getObservation(id: string): Promise<ObservationDetail> {
  const { data } = await apiClient.get(`/observations/${id}`)
  return data
}

export async function createObservation(body: ObservationCreate): Promise<ObservationDetail> {
  const { data } = await apiClient.post('/observations', body)
  return data
}

export async function updateObservation(id: string, body: Partial<ObservationCreate>): Promise<ObservationDetail> {
  const { data } = await apiClient.patch(`/observations/${id}`, body)
  return data
}

export async function deleteObservation(id: string): Promise<void> {
  await apiClient.delete(`/observations/${id}`)
}

export async function getSimilarObservations(id: string, limit = 5): Promise<ObservationSummary[]> {
  const { data } = await apiClient.get(`/observations/${id}/similar`, { params: { limit } })
  return data
}

export async function uploadMedia(
  observationId: string,
  file: File,
  mediaType: string
): Promise<MediaAttachment> {
  const form = new FormData()
  form.append('file', file)
  form.append('media_type', mediaType)
  const { data } = await apiClient.post(`/observations/${observationId}/media`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteMedia(observationId: string, mediaId: string): Promise<void> {
  await apiClient.delete(`/observations/${observationId}/media/${mediaId}`)
}
