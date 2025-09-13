// src/lib/services/services.ts
import type { Service } from "@/components/Services/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Server-side shape (snake_case) según la API (swagger)
 * schedule puede ser array de strings o array de objetos (p.ej. { date: '2025-09-01' }).
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
  contract_start_date?: string | null; // date
  start_time?: string | null; // time string e.g. "22:00:00"
  end_time?: string | null; // time string e.g. "06:00:00"
  schedule?: Array<string | { [key: string]: any }> | null;
  recurrent?: boolean | null;
  total_hours?: string | null;
  created_at?: string | null; // date-time
  updated_at?: string | null; // date-time
  is_active?: boolean;
};

/**
 * Payloads (coinciden con lo que acepta el backend)
 * Usamos snake_case porque el backend lo espera según tu ejemplo swagger.
 */
export type CreateServicePayload = {
  name: string;
  description?: string | null;
  guard?: number | null;
  assigned_property?: number | null;
  rate?: string | null;
  monthly_budget?: string | null;
  contract_start_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  schedule?: Array<string | { [key: string]: any }>; // puede aceptar strings o objetos si el backend lo permite
  recurrent?: boolean;
  is_active?: boolean;
};

export type UpdateServicePayload = Partial<CreateServicePayload>;

/**
 * Mapea ServerService -> Service (cliente, camelCase)
 */
function mapServerService(s: ServerService): Service {
  const schedule: string[] | null = Array.isArray(s.schedule)
    ? s.schedule.map((it) => {
        if (typeof it === "string") return it;
        if (it && typeof it === "object") {
          // priorizamos propiedades comunes
          if ("date" in it && it.date) return String(it.date);
          if ("schedule" in it && it.schedule) return String(it.schedule);
          if ("start" in it && it.start) return String(it.start);
          if ("day" in it && it.day) return String(it.day);
          // cualquier otro objeto lo convertimos a JSON minimal (fallback)
          try {
            return String(JSON.stringify(it));
          } catch {
            return String(it);
          }
        }
        return String(it);
      })
    : null;

  return {
    id: s.id,
    name: s.name,
    description: s.description ?? null,
    guard: s.guard ?? null,
    guardName: s.guard_name ?? null,
    assignedProperty: s.assigned_property ?? null,
    propertyName: s.property_name ?? null,
    rate: s.rate ?? null,
    monthlyBudget: s.monthly_budget ?? null,
    contractStartDate: s.contract_start_date ?? null,
    startTime: s.start_time ?? null,
    endTime: s.end_time ?? null,
    schedule,
    recurrent: typeof s.recurrent === "boolean" ? s.recurrent : null,
    totalHours: s.total_hours ?? null,
    createdAt: s.created_at ?? null,
    updatedAt: s.updated_at ?? null,
    isActive: typeof s.is_active === "boolean" ? s.is_active : null,
  } as Service;
}

/**
 * listServices
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

  if (payload.contract_start_date !== undefined && payload.contract_start_date !== null && payload.contract_start_date !== "") {
    body.contract_start_date = payload.contract_start_date;
  }

  if (payload.start_time !== undefined && payload.start_time !== null && payload.start_time !== "") {
    body.start_time = payload.start_time;
  }

  if (payload.end_time !== undefined && payload.end_time !== null && payload.end_time !== "") {
    body.end_time = payload.end_time;
  }

  if (payload.schedule !== undefined && payload.schedule !== null) {
    // enviamos array tal cual (strings u objetos) — ajusta si el backend exige objetos concretos
    body.schedule = payload.schedule;
  }

  if (payload.recurrent !== undefined) {
    body.recurrent = payload.recurrent;
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

  if (payload.contract_start_date !== undefined) {
    if (payload.contract_start_date === "") {
      // omitimos
    } else {
      body.contract_start_date = payload.contract_start_date;
    }
  }

  if (payload.start_time !== undefined) {
    if (payload.start_time === "") {
      // omitimos
    } else {
      body.start_time = payload.start_time;
    }
  }

  if (payload.end_time !== undefined) {
    if (payload.end_time === "") {
      // omitimos
    } else {
      body.end_time = payload.end_time;
    }
  }

  if (payload.schedule !== undefined) {
    // si el usuario pasa array vacío quizá quiera limpiar: si quieres soportar "vaciar schedule",
    // descomenta la siguiente línea y envía body.schedule = payload.schedule;
    if (Array.isArray(payload.schedule)) {
      body.schedule = payload.schedule;
    }
  }

  if (payload.recurrent !== undefined) {
    body.recurrent = payload.recurrent;
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
 * Ahora acepta guardId para enviar guard_id en los params.
 */
export async function listServicesByGuard(
  guardId: number,
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Service>> {
  return drfList<ServerService, Service>(
    endpoints.services_by_guard,
    {
      guard_id: guardId,
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
  propertyId: number,
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Service>> {
  return drfList<ServerService, Service>(
    endpoints.services_by_property,
    {
      property_id: propertyId,
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerService,
  );
}

/**
 * listServiceShifts
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
