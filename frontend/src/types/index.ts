export type Role = 'grower' | 'manager' | 'admin'
export type Category = 'pest' | 'disease' | 'nutrition' | 'environment' | 'general'
export type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest'
export type MediaType = 'image' | 'audio' | 'video'

export interface User {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface MediaAttachment {
  id: string
  observation_id: string
  media_type: MediaType
  storage_path: string
  original_name: string | null
  size_bytes: number | null
  transcription: string | null
  created_at: string
}

export interface ObservationSummary {
  id: string
  author_id: string
  body: string
  crop_type: string | null
  growth_stage: GrowthStage | null
  zone_id: string | null
  category: Category | null
  severity: number | null
  observed_at: string
  needs_embedding: boolean
}

export interface ObservationDetail extends ObservationSummary {
  body_enriched: string | null
  temp_c: number | null
  humidity_pct: number | null
  co2_ppm: number | null
  light_klux: number | null
  created_at: string
  updated_at: string
  author: User
  media_attachments: MediaAttachment[]
}

export interface PaginatedObservations {
  items: ObservationSummary[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface SearchHit {
  observation: ObservationSummary
  similarity: number
}

export interface SearchResponse {
  results: SearchHit[]
  query: string
  total: number
  query_embedding_ms: number
  search_ms: number
}

export interface ObservationCreate {
  body: string
  crop_type?: string
  growth_stage?: GrowthStage
  zone_id?: string
  category?: Category
  severity?: number
  temp_c?: number
  humidity_pct?: number
  co2_ppm?: number
  light_klux?: number
  observed_at?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}
