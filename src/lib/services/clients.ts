// src/lib/services/clients.ts
import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'

/**
 * Server (DRF) shape (snake_case)
 */
type ServerClient = {
  id: number
  username?: string
  user?: number
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  balance?: string
  created_at?: string
  updated_at?: string
  is_active?: boolean
}

/**
 * App shape (camelCase)
 */
export type AppClient = {
  id: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  balance?: string
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
}

/**
 * Payloads for create / update
 * Use snake_case for fields sent to the backend (DRF)
 */
export type CreateClientPayload = {
  username?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  balance?: string
  // add other fields if your backend requires them
}

export type UpdateClientPayload = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  balance?: string
  is_active?: boolean
}

/* ---------------------------
   Helper: map server -> app
   --------------------------- */
function mapServerClient(client: ServerClient): AppClient {
  return {
    id: client.id,
    username: client.username ?? undefined,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phone: client.phone,
    balance: client.balance,
    createdAt: client.created_at,
    updatedAt: client.updated_at,
    isActive: client.is_active,
  }
}

/* ----------------------------------------------------------------
   listClients: supports DRF-style pagination responses and plain array
   returns: { items, count, next, previous }
   ---------------------------------------------------------------- */
export async function listClients(
  page?: number,
  search?: string
): Promise<{ items: AppClient[]; count?: number; next: string | null; previous: string | null }> {
  const params: Record<string, unknown> = {}
  if (typeof page === 'number') params.page = page
  if (search && String(search).trim() !== '') params.search = String(search).trim()

  const { data } = await api.get<any>(endpoints.clients, { params })

  // If backend returns an array (no pagination)
  if (Array.isArray(data)) {
    const items = data.map((d: ServerClient) => mapServerClient(d))
    return { items, count: items.length, next: null, previous: null }
  }

  // DRF-style paginated response { count, next, previous, results }
  const rawItems: ServerClient[] = data.results ?? []
  const items = rawItems.map(mapServerClient)

  return {
    items,
    count: typeof data.count === 'number' ? data.count : items.length,
    next: data.next ?? null,
    previous: data.previous ?? null,
  }
}

/* ---------------------------
   getClient (detail)
   --------------------------- */
export async function getClient(id: number): Promise<AppClient> {
  const { data } = await api.get<ServerClient>(`${endpoints.clients}${id}/`)
  return mapServerClient(data)
}

/* ---------------------------
   createClient
   --------------------------- */
export async function createClient(payload: CreateClientPayload): Promise<AppClient> {
  const { data } = await api.post<ServerClient>(endpoints.clients, payload)
  return mapServerClient(data)
}

/* ---------------------------
   updateClient (PATCH)
   --------------------------- */
export async function updateClient(id: number, payload: UpdateClientPayload): Promise<AppClient> {
  const { data } = await api.patch<ServerClient>(`${endpoints.clients}${id}/`, payload)
  return mapServerClient(data)
}

/* ---------------------------
   deleteClient
   --------------------------- */
export async function deleteClient(id: number): Promise<void> {
  await api.delete(`${endpoints.clients}${id}/`)
}

/* ---------------------------
   getClientProperties
   convenience helper for GET /clients/{id}/properties/
   normalizes results to array
   --------------------------- */
export async function getClientProperties(id: number): Promise<any[]> {
  const url = `${endpoints.clients}${id}/properties/`
  const { data } = await api.get<any>(url)
  return Array.isArray(data) ? data : data?.results ?? []
}
