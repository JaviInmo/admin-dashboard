// src/lib/services/shifts.ts
import type { Shift } from "@/components/Shifts/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Server side shape (snake_case) según la API que compartiste
 * He incluido campos adicionales que aparecen en el Swagger (opcionalmente)
 */
type ServerShift = {
  id: number;
  guard: number;
  guard_details?: unknown;
  property: number;
  property_details?: unknown;
  service?: number | null;
  service_details?: unknown;
  start_time: string; // ISO
  end_time: string; // ISO
  status: "scheduled" | "completed" | "voided";
  hours_worked: number;
  is_armed?: boolean;
  weapon_details?: string;
  is_active?: boolean;
};

/**
 * Payloads para crear/actualizar (mantengo los campos mínimos)
 */
export type CreateShiftPayload = {
  guard: number;
  property: number;
  start_time: string; // ISO
  end_time: string; // ISO
  status?: "scheduled" | "completed" | "voided";
  is_armed?: boolean;
};

export type UpdateShiftPayload = Partial<CreateShiftPayload>;

/**
 * Mapea ServerShift -> Shift (cliente)
 * Si quieres exponer guard_details / property_details / service_details
 * en el cliente, amplía el tipo Shift en "@/components/Shifts/types".
 */
function mapServerShift(s: ServerShift): Shift {
  return {
    id: s.id,
    guard: s.guard,
    property: s.property,
    startTime: s.start_time,
    endTime: s.end_time,
    status: s.status,
    hoursWorked: s.hours_worked,
    isActive: s.is_active ?? true,
  } as Shift;
}

/**
 * listShifts
 * Nota: la ruta GET /shifts/ en el Swagger sólo documenta
 * search, ordering, page, page_size — por eso aquí sólo envío esos params.
 */
export async function listShifts(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Shift>> {
  const params: Record<string, unknown> = {
    page,
    page_size: pageSize ?? 10,
    ordering: ordering ?? undefined,
  };

  if (search && String(search).trim() !== "") {
    params.search = String(search).trim();
  }

  return drfList<ServerShift, Shift>(
    endpoints.shifts,
    params,
    mapServerShift,
  );
}

export const SHIFTS_KEY = "shifts" as const;

export async function getShift(id: number): Promise<Shift> {
  const { data } = await api.get<ServerShift>(`${endpoints.shifts}${id}/`);
  return mapServerShift(data);
}

export async function createShift(payload: CreateShiftPayload): Promise<Shift> {
  const body: Record<string, unknown> = {
    guard: payload.guard,
    property: payload.property,
    start_time: payload.start_time,
    end_time: payload.end_time,
  };

  if (payload.status !== undefined && payload.status !== null) {
    body.status = payload.status;
  }
  if (typeof payload.is_armed === "boolean") {
    body.is_armed = payload.is_armed;
  }

  const { data } = await api.post<ServerShift>(endpoints.shifts, body);
  return mapServerShift(data);
}

export async function updateShift(
  id: number,
  payload: UpdateShiftPayload,
): Promise<Shift> {
  const body: Record<string, unknown> = {};

  if (payload.guard !== undefined && payload.guard !== null) {
    body.guard = payload.guard;
  }
  if (payload.property !== undefined && payload.property !== null) {
    body.property = payload.property;
  }
  if (
    // en el cliente puede que uses start_time como string vacío; filtramos
    payload.start_time !== undefined &&
    payload.start_time !== null &&
    payload.start_time !== ""
  ) {
    body.start_time = payload.start_time;
  }
  if (
    payload.end_time !== undefined &&
    payload.end_time !== null &&
    payload.end_time !== ""
  ) {
    body.end_time = payload.end_time;
  }
  if (payload.status !== undefined && payload.status !== null) {
    body.status = payload.status;
  }
  if (typeof payload.is_armed === "boolean") {
    body.is_armed = payload.is_armed;
  }

  const { data } = await api.patch<ServerShift>(
    `${endpoints.shifts}${id}/`,
    body,
  );
  return mapServerShift(data);
}

export async function deleteShift(id: number): Promise<void> {
  await api.delete(`${endpoints.shifts}${id}/`);
}

/**
 * Acciones custom
 */
export async function softDeleteShift(id: number): Promise<void> {
  await api.post(`${endpoints.shifts}${id}/soft_delete/`);
}

export async function restoreShift(id: number): Promise<void> {
  await api.post(`${endpoints.shifts}${id}/restore/`);
}

/**
 * Listados personalizados que usa la API:
 * - /shifts/by_guard/?guard_id=...
 * - /shifts/by_property/?property_id=...
 * - /shifts/by_service/?service_id=...
 */
export async function listShiftsByGuard(
  guardId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Shift>> {
  return drfList<ServerShift, Shift>(
    `${endpoints.shifts}by_guard/`,
    {
      guard_id: guardId,
      page,
      page_size: pageSize ?? 10,
      ordering: ordering ?? undefined,
    },
    mapServerShift,
  );
}

export async function listShiftsByProperty(
  propertyId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Shift>> {
  return drfList<ServerShift, Shift>(
    `${endpoints.shifts}by_property/`,
    {
      property_id: propertyId,
      page,
      page_size: pageSize ?? 10,
      ordering: ordering ?? undefined,
    },
    mapServerShift,
  );
}

export async function listShiftsByService(
  serviceId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Shift>> {
  return drfList<ServerShift, Shift>(
    `${endpoints.shifts}by_service/`,
    {
      service_id: serviceId,
      page,
      page_size: pageSize ?? 10,
      ordering: ordering ?? undefined,
    },
    mapServerShift,
  );
}

/**
 * Bulk endpoints (implementados genéricamente — adapta la forma de `data` si tu backend espera otro shape)
 */
export async function bulkDeleteShifts(data: unknown): Promise<unknown> {
  // Ej: data puede ser { ids: [1,2,3] } o un array de objetos, según tu API
  const { data: res } = await api.post(`${endpoints.shifts}bulk_delete/`, data);
  return res;
}

export async function bulkUpdateShifts(data: unknown): Promise<unknown> {
  // Ej: data puede ser [{ id: 1, ...fields }, { id: 2, ...}] según tu API
  const { data: res } = await api.post(`${endpoints.shifts}bulk_update/`, data);
  return res;
}
