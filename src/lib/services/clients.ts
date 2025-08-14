// src/lib/services/clients.ts
import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { drfList, type PaginatedResult } from '@/lib/pagination'
import type { Client } from '@/components/Clients/types' // <-- usar el tipo de la UI

/** Server (DRF) shape (snake_case) */
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

/**
 * Payloads que el frontend puede usar para crear/actualizar clientes.
 * Usamos snake_case porque tu backend DRF aparentemente espera esos campos.
 */
export type CreateClientPayload = {
  username?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  balance?: string
}

export type UpdateClientPayload = {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  balance?: string
  is_active?: boolean
}

export type AppClient = Client

/* ----------------------------------------------------------------
  mapServerClient -> devuelve el shape que tu UI espera (Client)
  ---------------------------------------------------------------- */
function mapServerClient(client: ServerClient): Client {
  return {
    id: client.id,
    username: client.username,
    firstName: client.first_name,
    lastName: client.last_name,
    // fallback a string vacío si backend no trae email
    email: client.email ?? '',
    phone: client.phone,
    balance: client.balance !== undefined ? Number(client.balance) : undefined,
    // si tu tipo Client usa camelCase createdAt/updatedAt cámbialo; ahora dejo snake
    created_at: client.created_at,
    updated_at: client.updated_at,
    isActive: client.is_active,
  }
}

/* ----------------------------------------------------------------
  listClients: usamos el mismo helper drfList y devolvemos PaginatedResult<Client>
  ---------------------------------------------------------------- */
export async function listClients(
  page?: number,
  search?: string,
  pageSize: number = 10
): Promise<PaginatedResult<Client>> {
  return drfList<ServerClient, Client>(
    endpoints.clients,
    {
      page,
      page_size: pageSize,
      search: search && String(search).trim() !== '' ? String(search).trim() : undefined,
    },
    mapServerClient
  )
}

export const CLIENT_KEY = 'clients' as const

export async function getClient(id: number): Promise<Client> {
  const { data } = await api.get<ServerClient>(`${endpoints.clients}${id}/`)
  return mapServerClient(data)
}

/* ahora usan los tipos exportados */
export async function createClient(payload: CreateClientPayload): Promise<Client> {
  const { data } = await api.post<ServerClient>(endpoints.clients, payload)
  return mapServerClient(data)
}

export async function updateClient(id: number, payload: UpdateClientPayload): Promise<Client> {
  const { data } = await api.patch<ServerClient>(`${endpoints.clients}${id}/`, payload)
  return mapServerClient(data)
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`${endpoints.clients}${id}/`)
}

export async function getClientProperties(id: number): Promise<any[]> {
  const url = `${endpoints.clients}${id}/properties/`
  const { data } = await api.get<any>(url)
  return Array.isArray(data) ? data : data?.results ?? []
}
