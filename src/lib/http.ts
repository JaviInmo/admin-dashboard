// src/lib/http.ts
// Axios instance with base URL and auth interceptors.

import axios, {AxiosError, type InternalAxiosRequestConfig} from 'axios'
import { API_BASE_URL, WITH_CREDENTIALS } from './constants'
import { getAccessToken, clearAllTokens } from './auth-storage'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set to true if your backend uses cookie-based auth and same-site policies
  withCredentials: WITH_CREDENTIALS,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    // Axios header types allow string | number | boolean
    ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401) {
      // Token invalid/expired – clear local tokens.
      clearAllTokens()
      // Optionally, emit an app-level event to trigger a logout flow.
      // For now we just clear and forward the error.
    }

    return Promise.reject(error)
  }
)
