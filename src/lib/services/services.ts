// src/lib/services.ts
import type { Service } from "@/components/Services/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Server-side shape (snake_case) según la API (swagger)
 */
type ServerService = {
  id: number;
  name: string;
  description?: string | null;
  guard?: number | null;
  guard_name?: string | null;
  assigned_property?: number | null;
  property_name?: string | null;
  rate?: string | null; // decimal string
  monthly_budget?: string | null; // decimal string
  total_hours?: string | null;
  created_at?: string | null; // date-time
  updated_at?: string | null; // date-time
  is_active?: boolean;
};

/**
 * Payloads (coinciden con lo que acepta el backend)
 */
export type CreateServicePayload = {
  name: string;
  description?: string | null;
  guard?: number | null;
  assigned_property?: number | null;
  rate?: string | null;
  monthly_budget?: string | null;
  is_active?: boolean;
};

export type UpdateServicePayload = Partial<CreateServicePayload>;

/**
 * Mapea ServerService -> Service (cliente, camelCase)
 * Ajusta si tu Service type en "@/components/Services/types" difiere.
 */
function mapServerService(s: ServerService): Service {
  return {
    id: s.id,
    // campos asumidos en el tipo Service (camelCase)
    name: s.name,
    description: s.description ?? null,
    guard: s.guard ?? null,
    guardName: s.guard_name ?? null,
    assignedProperty: s.assigned_property ?? null,
    propertyName: s.property_name ?? null,
    rate: s.rate ?? null,
    monthlyBudget: s.monthly_budget ?? null,
    totalHours: s.total_hours ?? null,
    createdAt: s.created_at ?? null,
    updatedAt: s.updated_at ?? null,
    isActive: typeof s.is_active === "boolean" ? s.is_active : null,
  } as unknown as Service;
}

/**
 * listServices
 * Parámetros: page, search, pageSize, ordering
 */
export async function listServices(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Service>> {
  return drfList<ServerService, Service>(
    endpoints.services,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerService,
  );
}

export const SERVICES_KEY = "services" as const;

/**
 * getService
 */
export async function getService(id: number): Promise<Service> {
  const { data } = await api.get<ServerService>(`${endpoints.services}${id}/`);
  return mapServerService(data);
}

/**
 * createService
 * Construye body explícito y sanitizado (evita enviar campos vacíos).
 */
export async function createService(payload: CreateServicePayload): Promise<Service> {
  const body: Record<string, unknown> = {
    name: payload.name,
  };

  if (payload.description !== undefined && payload.description !== null && payload.description !== "") {
    body.description = payload.description;
  }

  if (payload.guard !== undefined) {
    body.guard = payload.guard;
  }

  if (payload.assigned_property !== undefined) {
    body.assigned_property = payload.assigned_property;
  }

  if (payload.rate !== undefined && payload.rate !== null && payload.rate !== "") {
    body.rate = payload.rate;
  }

  if (payload.monthly_budget !== undefined && payload.monthly_budget !== null && payload.monthly_budget !== "") {
    body.monthly_budget = payload.monthly_budget;
  }

  if (payload.is_active !== undefined) {
    body.is_active = payload.is_active;
  }

  // Defender: nunca enviar user por accidente
  if ("user" in body) {
    delete (body as any).user;
  }

  const { data } = await api.post<ServerService>(endpoints.services, body);
  return mapServerService(data);
}

/**
 * updateService (PATCH semantics: sólo campos presentes)
 */
export async function updateService(id: number, payload: UpdateServicePayload): Promise<Service> {
  const body: Record<string, unknown> = {};

  if (payload.name !== undefined && payload.name !== null) {
    body.name = payload.name;
  }

  if (payload.description !== undefined) {
    if (payload.description === "") {
      // omitimos cadena vacía intencionalmente
    } else {
      body.description = payload.description;
    }
  }

  if (payload.guard !== undefined) {
    body.guard = payload.guard;
  }

  if (payload.assigned_property !== undefined) {
    body.assigned_property = payload.assigned_property;
  }

  if (payload.rate !== undefined) {
    if (payload.rate === "") {
      // omitimos
    } else {
      body.rate = payload.rate;
    }
  }

  if (payload.monthly_budget !== undefined) {
    if (payload.monthly_budget === "") {
      // omitimos
    } else {
      body.monthly_budget = payload.monthly_budget;
    }
  }

  if (payload.is_active !== undefined) {
    body.is_active = payload.is_active;
  }

  // Defender: nunca enviar user
  if ("user" in body) {
    delete (body as any).user;
  }

  const { data } = await api.patch<ServerService>(`${endpoints.services}${id}/`, body);
  return mapServerService(data);
}

/**
 * deleteService (DELETE /services/{id}/)
 */
export async function deleteService(id: number): Promise<void> {
  await api.delete(`${endpoints.services}${id}/`);
}

/**
 * softDeleteService (POST /services/{id}/soft_delete/)
 */
export async function softDeleteService(id: number): Promise<Service> {
  const { data } = await api.post<ServerService>(`${endpoints.services}${id}/soft_delete/`);
  return mapServerService(data);
}

/**
 * restoreService (POST /services/{id}/restore/)
 */
export async function restoreService(id: number): Promise<Service> {
  const { data } = await api.post<ServerService>(`${endpoints.services}${id}/restore/`);
  return mapServerService(data);
}

/**
 * listServicesByGuard
 */
export async function listServicesByGuard(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Service>> {
  return drfList<ServerService, Service>(
    endpoints.services_by_guard,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerService,
  );
}

/**
 * listServicesByProperty
 */
export async function listServicesByProperty(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Service>> {
  return drfList<ServerService, Service>(
    endpoints.services_by_property,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerService,
  );
}

/**
 * getServiceShifts
 * Reutiliza drfList apuntando al sub-endpoint {id}/shifts/
 * Usamos un mapper identity para que el caller haga el cast/tipado si lo necesita.
 */
type ServerShift = any;
export async function listServiceShifts(
  serviceId: number,
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<ServerShift>> {
  return drfList<ServerShift, ServerShift>(
    `${endpoints.services}${serviceId}/shifts/`,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    (s) => s,
  );
}
