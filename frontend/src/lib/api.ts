const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
const browserHost =
  typeof window !== 'undefined' ? window.location.hostname : import.meta.env.DEV ? 'localhost' : ''
const isLocalHost = browserHost === 'localhost' || browserHost === '127.0.0.1'

export const API_BASE_URL = configuredApiBaseUrl || (isLocalHost ? 'http://localhost:8000' : '')

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}
