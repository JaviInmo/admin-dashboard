// src/lib/services/users.ts
import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { drfList, type PaginatedResult } from '@/lib/pagination'

/**
 * Server shapes (según swagger)
 */
type ServerUser = {
  id: number
  username: string
  email: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  is_staff?: boolean
  is_superuser?: boolean
  date_joined?: string
  last_login?: string | null
}

/**
 * App shape (más cómodo para la UI)
 */
export type AppUser = {
  id: number
  username: string
  email: string
  firstName?: string
  lastName?: string
  name: string // computed (first + last || username)
  isActive?: boolean
  isStaff?: boolean
  isSuperuser?: boolean
  dateJoined?: string
  lastLogin?: string | null
}

/**
 * Create / Update payloads
 */
export type CreateUserPayload = {
  username: string
  email?: string
  first_name?: string
  last_name?: string
  password: string
  password_confirm?: string
  is_active?: boolean
  is_staff?: boolean
}

export type UpdateUserPayload = {
  email?: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  is_staff?: boolean
  // note: password update not included here (handle separately if backend exposes)
}

/** Helpers */
function mapServerUser(u: ServerUser): AppUser {
  const first = u.first_name ?? ''
  const last = u.last_name ?? ''
  const name = (first || last) ? `${first} ${last}`.trim() : u.username
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    name,
    isActive: u.is_active,
    isStaff: u.is_staff,
    isSuperuser: u.is_superuser,
    dateJoined: u.date_joined,
    lastLogin: u.last_login ?? null,
  }
}

/**
 * listUsers: soporta tanto respuesta plana (Array<User>) como paginada ({ results: [...] })
 * Devuelve siempre AppUser[]
 */
export async function listUsers(
  page?: number,
  search?: string,
  pageSize: number = 10
): Promise<PaginatedResult<AppUser>> {
  return drfList<ServerUser, AppUser>(
    endpoints.users,
    {
      page,
      page_size: pageSize,
      search: search && String(search).trim() !== '' ? String(search).trim() : undefined,
    },
    mapServerUser
  )
}

export async function getUser(id: number): Promise<AppUser> {
  const { data } = await api.get<ServerUser>(`${endpoints.users}${id}/`)
  return mapServerUser(data)
}

export async function createUser(payload: CreateUserPayload): Promise<AppUser> {
  // Asegúrate de enviar password_confirm si tu backend lo requiere: si no viene, lo seteamos igual al password
  const body = {
    ...payload,
    password_confirm: payload.password_confirm ?? payload.password,
  }
  const { data } = await api.post<ServerUser>(endpoints.users, body)
  return mapServerUser(data)
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<AppUser> {
  const { data } = await api.patch<ServerUser>(`${endpoints.users}${id}/`, payload)
  return mapServerUser(data)
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`${endpoints.users}${id}/`)
}
