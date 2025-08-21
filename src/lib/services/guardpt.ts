// src/lib/services/guardpt.ts
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Endpoint (usa endpoints.guardPropertyTariffs si está definido,
 * si no, fallback a la ruta literal). Nos aseguramos que termine con '/'
 * para poder concatenar subpaths de forma segura.
 */
const raw = (endpoints as any).guardPropertyTariffs ?? "api/guard-property-tariffs";
const TARIFFS_ENDPOINT = raw.endsWith("/") ? raw : `${raw}/`;

/* ----------------------
   Tipos del servidor / cliente
   ---------------------- */

type ServerGuardPropertyTariff = {
  id: number;
  guard: number;
  guard_details?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
  };
  property: number;
  property_details?: {
    id?: number;
    owner?: number;
    name?: string | null;
    alias?: string | null;
    address?: string | null;
    monthly_rate?: string | null;
    contract_start_date?: string | null;
    total_hours?: number | null;
  };
  rate?: string | number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GuardPropertyTariff = {
  id: number;
  guardId: number;
  guardDetails?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
  } | null;
  propertyId: number;
  propertyDetails?: {
    id?: number;
    owner?: number;
    name?: string | null;
    alias?: string | null;
    address?: string | null;
    monthlyRate?: string | null;
    contractStartDate?: string | null;
    totalHours?: number | null;
  } | null;
  rate: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateGuardPropertyTariffPayload = {
  guard: number;
  property: number;
  rate: string;
  is_active?: boolean;
};

export type UpdateGuardPropertyTariffPayload = Partial<CreateGuardPropertyTariffPayload>;

/* ----------------------
   Mapper
   ---------------------- */
function mapServerTariff(s: ServerGuardPropertyTariff): GuardPropertyTariff {
  const propDetails = s.property_details ?? {};
  return {
    id: s.id,
    guardId: s.guard,
    guardDetails: s.guard_details
      ? {
          id: s.guard_details.id,
          firstName: s.guard_details.first_name,
          lastName: s.guard_details.last_name,
          name: s.guard_details.name,
          email: s.guard_details.email,
        }
      : null,
    propertyId: s.property,
    propertyDetails: s.property_details
      ? {
          id: propDetails.id,
          owner: propDetails.owner,
          name: propDetails.name ?? null,
          alias: propDetails.alias ?? null,
          address: propDetails.address ?? null,
          monthlyRate: propDetails.monthly_rate ?? null,
          contractStartDate: propDetails.contract_start_date ?? null,
          totalHours: propDetails.total_hours ?? null,
        }
      : null,
    rate: String(s.rate ?? ""),
    isActive: Boolean(s.is_active),
    createdAt: s.created_at ?? null,
    updatedAt: s.updated_at ?? null,
  };
}

/* ----------------------
   Keys
   ---------------------- */
export const GUARD_PROPERTY_TARIFFS_KEY = "guard_property_tariffs" as const;

/* ----------------------
   CRUD + list helpers
   ---------------------- */

/**
 * List general (paginated). ordering acepta string (ej: "property" o "-property").
 */
export async function listGuardPropertyTariffs(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string
): Promise<PaginatedResult<GuardPropertyTariff>> {
  return drfList<ServerGuardPropertyTariff, GuardPropertyTariff>(
    TARIFFS_ENDPOINT,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerTariff
  );
}

/**
 * List by guard (usa endpoint /by_guard/).
 * Compatibilidades:
 * - query param: ?guard=ID  (algunos backends)
 * - query param: ?guard_id=ID (otros backends)
 * - ruta: /by_guard/<ID>/ (otros backends)
 *
 * Envia ambos params (guard y guard_id) cuando usamos query params para
 * cubrir variantes comunes.
 */
// solo la función (src/lib/services/guardpt.ts)
export async function listGuardPropertyTariffsByGuard(
  guardId?: number,
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string
): Promise<PaginatedResult<GuardPropertyTariff>> {
  const url = `${TARIFFS_ENDPOINT}by_guard/`;

  const params: Record<string, unknown> = {
    page,
    page_size: pageSize ?? 10,
    search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
    ordering: ordering ?? undefined,
    ...(guardId ? { guard: guardId, guard_id: guardId } : {}),
  };

  return drfList<ServerGuardPropertyTariff, GuardPropertyTariff>(
    url,
    params,
    mapServerTariff
  );
}


/**
 * List by property (usa endpoint /by_property/). Si pasas propertyId lo enviamos como query param.
 */
export async function listGuardPropertyTariffsByProperty(
  propertyId?: number,
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string
): Promise<PaginatedResult<GuardPropertyTariff>> {
  const url = `${TARIFFS_ENDPOINT}by_property/`;
  return drfList<ServerGuardPropertyTariff, GuardPropertyTariff>(
    url,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
      ...(propertyId ? { property: propertyId, property_id: propertyId } : {}),
    },
    mapServerTariff
  );
}

/**
 * Get by id
 */
export async function getGuardPropertyTariff(id: number): Promise<GuardPropertyTariff> {
  const { data } = await api.get<ServerGuardPropertyTariff>(`${TARIFFS_ENDPOINT}${id}/`);
  return mapServerTariff(data);
}

/**
 * Create
 */
export async function createGuardPropertyTariff(
  payload: CreateGuardPropertyTariffPayload
): Promise<GuardPropertyTariff> {
  const body: Record<string, unknown> = {
    guard_id: Number(payload.guard),
    property_id: Number(payload.property),
    rate: payload.rate,
  };

  if (payload.is_active !== undefined) body.is_active = payload.is_active;

  const { data } = await api.post<ServerGuardPropertyTariff>(TARIFFS_ENDPOINT, body);
  return mapServerTariff(data);
}

/**
 * Update (PATCH — actualiza solo los campos presentes; usa guard_id / property_id)
 */
export async function updateGuardPropertyTariff(
  id: number,
  payload: UpdateGuardPropertyTariffPayload
): Promise<GuardPropertyTariff> {
  const body: Record<string, unknown> = {};

  if (payload.guard !== undefined && payload.guard !== null) {
    body.guard_id = Number(payload.guard);
  }
  if (payload.property !== undefined && payload.property !== null) {
    body.property_id = Number(payload.property);
  }
  if (payload.rate !== undefined && payload.rate !== null && payload.rate !== "") {
    body.rate = payload.rate;
  }
  if (payload.is_active !== undefined) body.is_active = payload.is_active;

  const { data } = await api.patch<ServerGuardPropertyTariff>(`${TARIFFS_ENDPOINT}${id}/`, body);
  return mapServerTariff(data);
}

/**
 * Delete (hard delete)
 */
export async function deleteGuardPropertyTariff(id: number): Promise<void> {
  await api.delete(`${TARIFFS_ENDPOINT}${id}/`);
}

/* ----------------------
   Bulk + soft operations
   ---------------------- */

export async function bulkDeleteGuardPropertyTariffs(ids: number[]): Promise<void> {
  await api.post(`${TARIFFS_ENDPOINT}bulk_delete/`, { ids });
}

export async function bulkUpdateGuardPropertyTariffs(
  items: Array<{ id: number } & Partial<CreateGuardPropertyTariffPayload>>
): Promise<void> {
  await api.post(`${TARIFFS_ENDPOINT}bulk_update/`, { data: items });
}

export async function softDeleteGuardPropertyTariff(id: number): Promise<GuardPropertyTariff> {
  const { data } = await api.post<ServerGuardPropertyTariff>(`${TARIFFS_ENDPOINT}${id}/soft_delete/`, {});
  return mapServerTariff(data);
}

export async function restoreGuardPropertyTariff(id: number): Promise<GuardPropertyTariff> {
  const { data } = await api.post<ServerGuardPropertyTariff>(`${TARIFFS_ENDPOINT}${id}/restore/`, {});
  return mapServerTariff(data);
}
