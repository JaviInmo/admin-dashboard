// src/lib/services/clients.ts
import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'

// Tipo que devuelve el server (snake_case)
type ServerClient = {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  balance?: string
  created_at?: string
  updated_at?: string
  is_active?: boolean
}

// Tipo que usa la app (camelCase)
export type AppClient = {
  id: number
  username: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  balance?: string
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
}

// Payload para crear cliente: usa campos que el backend espera (snake_case)
// Ajusta si tu backend quiere otros campos (p.ej. password)
export type CreateClientPayload = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  // si tu backend necesita balance o password, añádelos aquí explicitamente
  balance?: string
  // password?: string
}

// Payload para actualizar (PATCH) — snake_case
export type UpdateClientPayload = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  balance?: string
  is_active?: boolean
}

// Mapea del server (snake_case) a AppClient (camelCase)
function mapServerClient(client: ServerClient): AppClient {
  return {
    id: client.id,
    username: client.username,
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

/**
 * Lista clientes.
 * Si el endpoint devuelve paginación, se usa data.results; si devuelve array, lo soporta también.
 */
export async function listClients(page?: number): Promise<AppClient[]> {
  const params: Record<string, unknown> = {}
  if (typeof page === 'number') params.page = page

  const { data } = await api.get<any>(endpoints.clients, { params })

  const items: ServerClient[] = Array.isArray(data) ? data : data?.results ?? []
  return items.map(mapServerClient)
}

/** Obtener cliente por id */
export async function getClient(id: number): Promise<AppClient> {
  const { data } = await api.get<ServerClient>(`${endpoints.clients}${id}/`)
  return mapServerClient(data)
}

/** Crear cliente */
export async function createClient(payload: CreateClientPayload): Promise<AppClient> {
  // Asegurarse de enviar al backend los campos que espera (snake_case)
  const { data } = await api.post<ServerClient>(endpoints.clients, payload)
  return mapServerClient(data)
}

/** Actualizar parcialmente */
export async function updateClient(id: number, payload: UpdateClientPayload): Promise<AppClient> {
  const { data } = await api.patch<ServerClient>(`${endpoints.clients}${id}/`, payload)
  return mapServerClient(data)
}

/** Borrar cliente */
export async function deleteClient(id: number): Promise<void> {
  await api.delete(`${endpoints.clients}${id}/`)
}
