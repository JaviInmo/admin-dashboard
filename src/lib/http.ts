// src/lib/http.ts
// Axios instance with base URL and auth interceptors.

import axios, {AxiosError, type InternalAxiosRequestConfig} from 'axios'
import { API_BASE_URL, WITH_CREDENTIALS, API_BASE_ROOT, DEFAULT_LANG } from './constants'
import { getAccessToken, clearAllTokens, getRefreshToken, setAccessToken, setUser, clearUser } from './auth-storage'
import { endpoints } from './endpoints'
import { decodeJWT } from './jwt'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set to true if your backend uses cookie-based auth and same-site policies
  withCredentials: WITH_CREDENTIALS,
})

// Initialize baseURL with persisted language (before any requests)
try {
  if (typeof window !== 'undefined') {
    const ENV_API_URL = import.meta.env.VITE_API_BASE_URL
    if (ENV_API_URL) {
      // Local development: always use /en/
      api.defaults.baseURL = `${API_BASE_ROOT}en/`
    } else {
      // AWS backend: use persisted language preference
      const saved = window.localStorage.getItem('app.lang')
      const lang = saved === 'en' || saved === 'es' ? saved : DEFAULT_LANG
      api.defaults.baseURL = `${API_BASE_ROOT}${lang}/`
    }
  }
} catch {}

// Track refresh state to avoid multiple parallel refresh calls
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function tryRefreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = api
    .post(endpoints.auth.refresh, { refresh })
    .then((res) => {
      const access = (res.data as any)?.access || (res.data as any)?.accessToken
      if (access) {
        setAccessToken(access)
        const claims = decodeJWT(access)
        if (claims) setUser(claims)
        return access
      }
      return null
    })
    .catch(() => {
      clearAllTokens()
      clearUser()
      return null
    })
    .finally(() => {
      isRefreshing = false
    })

  return refreshPromise
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = (config.url || '').toString()
  // Do NOT send Authorization header on auth endpoints that should be anonymous
  const isAnonAuthRoute = url.includes('api/auth/login') || url.includes('api/auth/refresh')

  if (!isAnonAuthRoute) {
    const token = getAccessToken()
    if (token) {
      config.headers = config.headers ?? {}
      // Axios header types allow string | number | boolean
      ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalConfig = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (status === 401) {
      // Avoid trying to refresh on the refresh endpoint itself
      const requestUrl = (originalConfig?.url || '').toString()
      const isRefreshCall = requestUrl.includes(endpoints.auth.refresh)

      if (!isRefreshCall && !originalConfig?._retry) {
        // Attempt a silent refresh
        const newAccess = await tryRefreshAccessToken()
        if (newAccess && originalConfig) {
          originalConfig._retry = true
          originalConfig.headers = originalConfig.headers ?? {}
          ;(originalConfig.headers as Record<string, string>)['Authorization'] = `Bearer ${newAccess}`
          return api.request(originalConfig)
        }
      }

      // Token invalid/expired and refresh failed – clear local tokens and user
      clearAllTokens()
      clearUser()
      // Optionally, emit an app-level event to trigger a logout flow.
      // For now we just clear and forward the error.
    }

    return Promise.reject(error)
  }
)
