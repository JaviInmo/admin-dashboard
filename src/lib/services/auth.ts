// src/lib/services/auth.ts
// High-level auth API built on top of the Axios client.

import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { setAccessToken, setRefreshToken, clearAllTokens } from '@/lib/auth-storage'

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
  user: ServerUser
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
  user: AuthUser
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const body = 'username' in payload
    ? { username: payload.username, password: payload.password }
    // Backend requires the field to be named `username`; map email to username
    : { username: payload.email, password: payload.password }

  const { data } = await api.post<ServerLoginResponse>(endpoints.auth.login, body)

  setAccessToken(data.access)
  if (data.refresh) setRefreshToken(data.refresh)

  return {
    accessToken: data.access,
    refreshToken: data.refresh,
    user: mapServerUser(data.user),
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post(endpoints.auth.logout)
  } catch {}
  clearAllTokens()
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<ServerUser>(endpoints.auth.me)
  return mapServerUser(data)
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
