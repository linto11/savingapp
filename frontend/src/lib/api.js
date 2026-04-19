const STORAGE_KEY = 'savingsApp.apiBaseUrl'
export const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000'
export const RENDER_BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || 'https://savingapp-4lbw.onrender.com').trim().replace(/\/$/, '')

function getStoredApiBaseUrl() {
  if (typeof window === 'undefined') return ''

  try {
    return (window.localStorage.getItem(STORAGE_KEY) || '').trim()
  } catch {
    return ''
  }
}

function isLocalDevelopmentHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

export function getApiBaseUrl() {
  const configuredBase = (getStoredApiBaseUrl() || import.meta.env.VITE_API_BASE_URL || '').trim()
  if (configuredBase) {
    return configuredBase.replace(/\/$/, '')
  }
  return isLocalDevelopmentHost() ? '/api' : ''
}

export function isApiConfigured() {
  return Boolean(getApiBaseUrl())
}

export function setApiBaseUrl(url) {
  if (typeof window === 'undefined') return

  const normalized = (url || '').trim().replace(/\/$/, '')
  try {
    if (normalized) {
      window.localStorage.setItem(STORAGE_KEY, normalized)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore storage errors in restricted browser modes
  }
}

export function apiUrl(path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()
  return baseUrl ? `${baseUrl}${normalizedPath}` : ''
}

export function apiFetch(path, options = {}) {
  const url = apiUrl(path)
  if (!url) {
    return Promise.reject(new Error('Backend API URL is not configured for this deployed app yet.'))
  }

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 8000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
}
