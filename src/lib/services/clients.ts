// src/lib/services/clients.ts
import type { Client } from "@/components/Clients/types"; // <-- usar el tipo de la UI
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";
// quitamos generateSort/SortOrder import porque listClients ahora recibe ordering string

/** Server (DRF) shape (snake_case) */
type ServerClient = {
  id: number;
  user?: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  billing_address?: string;
  balance?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
};

export type CreateClientPayload = {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  billing_address?: string;
  balance?: string;
};

export type UpdateClientPayload = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  billing_address?: string;
  balance?: string;
  // is_active ya no lo modificamos por PATCH según la API (es readOnly)
};

export type AppClient = Client;

function mapServerClient(client: ServerClient): Client & { user?: number } {
  return {
    id: client.id,
    user: client.user,
    username: client.username,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email ?? "",
    phone: client.phone,
    address: client.address,
    billingAddress: client.billing_address,
    balance:
      client.balance !== undefined && client.balance !== null
        ? Number(client.balance)
        : undefined,
    created_at: client.created_at,
    updated_at: client.updated_at,
    isActive: client.is_active,
  } as any;
}

/**
 * listClients
 * Ahora acepta `ordering?: string` (ej: "user__first_name" o "-user__first_name")
 * Igual que en listGuards, lo pasamos tal cual a DRF en `?ordering=...`
 */
export async function listClients(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Client>> {
  return drfList<ServerClient, Client>(
    endpoints.clients,
    {
      page,
      page_size: pageSize ?? 10,
      search:
        search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerClient,
  );
}

export const CLIENT_KEY = "clients" as const;

export async function getClient(
  id: number,
): Promise<Client & { user?: number }> {
  const { data } = await api.get<ServerClient>(`${endpoints.clients}${id}/`);
  return mapServerClient(data) as any;
}

export async function createClient(
  payload: CreateClientPayload,
): Promise<Client> {
  const { data } = await api.post<ServerClient>(endpoints.clients, payload);
  return mapServerClient(data);
}

export async function updateClient(
  id: number,
  payload: UpdateClientPayload,
): Promise<Client> {
  const { data } = await api.patch<ServerClient>(
    `${endpoints.clients}${id}/`,
    payload,
  );
  return mapServerClient(data);
}

/**
 * Soft delete (desactivar) y restore (reactivar)
 * Según la documentación del backend estas operaciones se hacen via POST:
 *   POST /clients/{id}/soft_delete/
 *   POST /clients/{id}/restore/
 *
 * La doc muestra que puede requerir un body con `user` (integer). Pasamos
 * `{ user: client.user }` cuando esté disponible; si no lo está, enviamos {}
 * (o puedes adaptar según lo que tu backend realmente espere).
 */
export async function softDeleteClient(
  id: number,
  payload?: { user?: number; phone?: string },
): Promise<Client> {
  const body = payload ?? {};
  const { data } = await api.post<ServerClient>(
    `${endpoints.clients}${id}/soft_delete/`,
    body,
  );
  return mapServerClient(data);
}

export async function restoreClient(
  id: number,
  payload?: { user?: number; phone?: string },
): Promise<Client> {
  const body = payload ?? {};
  const { data } = await api.post<ServerClient>(
    `${endpoints.clients}${id}/restore/`,
    body,
  );
  return mapServerClient(data);
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`${endpoints.clients}${id}/`);
}

export async function getClientProperties(id: number): Promise<any[]> {
  const url = `${endpoints.clients}${id}/properties/`;
  const { data } = await api.get<any>(url);
  return Array.isArray(data) ? data : (data?.results ?? []);
}
