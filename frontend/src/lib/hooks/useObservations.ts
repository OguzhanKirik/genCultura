import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listObservations,
  getObservation,
  createObservation,
  updateObservation,
  deleteObservation,
  getSimilarObservations,
  type ListObservationsParams,
} from '@/lib/api/observations'
import type { ObservationCreate } from '@/types'

export function useObservations(params: ListObservationsParams = {}) {
  return useQuery({
    queryKey: ['observations', params],
    queryFn: () => listObservations(params),
  })
}

export function useObservation(id: string) {
  return useQuery({
    queryKey: ['observations', id],
    queryFn: () => getObservation(id),
    enabled: !!id,
  })
}

export function useSimilarObservations(id: string) {
  return useQuery({
    queryKey: ['observations', id, 'similar'],
    queryFn: () => getSimilarObservations(id),
    enabled: !!id,
  })
}

export function useCreateObservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createObservation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['observations'] }),
  })
}

export function useUpdateObservation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<ObservationCreate>) => updateObservation(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['observations', id] })
      qc.invalidateQueries({ queryKey: ['observations'] })
    },
  })
}

export function useDeleteObservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteObservation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['observations'] }),
  })
}
