const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').trim()

export const API_BASE_URL = configuredBase
  ? configuredBase.replace(/\/$/, '')
  : '/api'

export function apiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export function apiFetch(path, options) {
  return fetch(apiUrl(path), options)
}
