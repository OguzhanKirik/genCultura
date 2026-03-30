const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// Media files are served from the backend root, not under /api/v1
export function mediaUrl(storagePath: string): string {
  const backendRoot = API_BASE.replace(/\/api\/v1\/?$/, '')
  return `${backendRoot}/media/${storagePath}`
}
