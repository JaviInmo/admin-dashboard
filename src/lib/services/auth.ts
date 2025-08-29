// src/lib/services/auth.ts
// High-level auth API built on top of the Axios client.

import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { setAccessToken, setRefreshToken, clearAllTokens, setUser, clearUser, getRefreshToken } from '@/lib/auth-storage'
import { decodeJWT } from '@/lib/jwt'

// Allow login by username or email
export type LoginRequest =
  | { username: string; password: string }
  | { email: string; password: string }

// Server shapes
type ServerUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

type ServerLoginResponse = {
  access: string
  refresh?: string
  user?: ServerUser | null
}

// App-level normalized shapes
export type AuthUser = {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken?: string
  user?: AuthUser
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const body = 'username' in payload
    ? { username: payload.username, password: payload.password }
    // Backend requires the field to be named `username`; map email to username
    : { username: payload.email, password: payload.password }

  const { data } = await api.post<ServerLoginResponse>(endpoints.auth.login, body)

  setAccessToken(data.access)
  if (data.refresh) setRefreshToken(data.refresh)

  // Some backends may omit the user object on login and require a follow-up call to `/me`.
  // Avoid throwing if `data.user` is missing; fetch it if needed and available.
  let user: AuthUser | undefined
  // Decode JWT claims and persist them as our user data source of truth
  const claims = decodeJWT(data.access)
  if (claims) {
    setUser(claims)
  }
  try {
    if (data.user) {
      user = mapServerUser(data.user)
    } else {
      // Prefer mapping from JWT claims if present; fallback to `/me` request
      if (claims) {
        user = claimsToAuthUser(claims)
      } else {
        // Attempt to fetch current user now that tokens are stored
        user = await getCurrentUser()
      }
    }
  } catch {
    // If fetching/me mapping fails, proceed without a user object
    user = undefined
  }

  return {
    accessToken: data.access,
    refreshToken: data.refresh,
    user,
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post(endpoints.auth.logout)
  } catch {}
  clearAllTokens()
  clearUser()
  // Asegurar que se limpie también el flag de login
  try {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('authToken')
  } catch {}
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<ServerUser>(endpoints.auth.me)
  return mapServerUser(data)
}

// Attempt to refresh the access token using the stored refresh token.
// Returns the new access token string on success, or null on failure.
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  try {
    const { data } = await api.post(endpoints.auth.refresh, { refresh })
    const access = (data as any)?.access || (data as any)?.accessToken
    if (!access) return null
    setAccessToken(access)
    const claims = decodeJWT(access)
    if (claims) setUser(claims)
    return access
  } catch {
    clearAllTokens()
    clearUser()
    return null
  }
}

function mapServerUser(user: ServerUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
  }
}

function claimsToAuthUser(claims: any): AuthUser {
  // Map common JWT claim fields into our minimal AuthUser
  return {
    id: typeof claims.user_id === 'number' ? claims.user_id : Number(claims.user_id ?? 0),
    username: String(claims.username ?? ''),
    email: String(claims.email ?? ''),
    firstName: String(claims.first_name ?? ''),
    lastName: String(claims.last_name ?? ''),
  }
}
