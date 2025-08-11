// src/lib/auth-storage.ts
// Simple token persistence helpers. Adjust if you prefer cookies or another storage.

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string) {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  } catch {}
}

export function clearAccessToken() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {}
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setRefreshToken(token: string) {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } catch {}
}

export function clearRefreshToken() {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {}
}

export function clearAllTokens() {
  clearAccessToken()
  clearRefreshToken()
}

export const tokenKeys = {
  access: ACCESS_TOKEN_KEY,
  refresh: REFRESH_TOKEN_KEY,
}
