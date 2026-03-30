import { apiClient } from './client'
import type { SearchResponse } from '@/types'

export interface SearchParams {
  q: string
  limit?: number
  min_similarity?: number
  crop_type?: string
  category?: string
  zone_id?: string
}

export async function semanticSearch(params: SearchParams): Promise<SearchResponse> {
  const { data } = await apiClient.get('/search', { params })
  return data
}
