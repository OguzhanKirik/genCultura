import { apiClient } from './client'

export interface RobotMission {
  id: string
  observation_id: string
  zone_id: string
  status: 'pending' | 'navigating' | 'at_location' | 'capturing' | 'uploading' | 'done' | 'failed'
  message: string
  image_count: number
}

export async function startRobotMission(observationId: string, zoneId: string): Promise<{ mission_id: string }> {
  const { data } = await apiClient.post('/robot/mission', {
    observation_id: observationId,
    zone_id: zoneId,
  })
  return data
}

export async function getRobotMission(missionId: string): Promise<RobotMission> {
  const { data } = await apiClient.get(`/robot/mission/${missionId}`)
  return data
}

export async function getRobotZones(): Promise<string[]> {
  const { data } = await apiClient.get('/robot/zones')
  return data.zones ?? []
}
