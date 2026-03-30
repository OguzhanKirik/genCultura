import { useQuery } from '@tanstack/react-query'
import { semanticSearch, type SearchParams } from '@/lib/api/search'

export function useSearch(params: SearchParams) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => semanticSearch(params),
    enabled: params.q.trim().length > 2,
    staleTime: 30_000,
  })
}
