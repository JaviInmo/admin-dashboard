// src/lib/services/shifts.ts
import type { Shift } from "@/components/Shifts/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Server side shape (camel_snake) según la API que compartiste
 */
type ServerShift = {
  id: number;
  guard: number;
  property: number;
  start_time: string; // ISO
  end_time: string; // ISO
  status: "scheduled" | "completed" | "voided";
  hours_worked: number;
  is_active?: boolean;
};

export type CreateShiftPayload = {
  guard: number;
  property: number;
  start_time: string; // ISO
  end_time: string; // ISO
  status?: "scheduled" | "completed" | "voided";
};

export type UpdateShiftPayload = Partial<CreateShiftPayload>;

/**
 * Mapea ServerShift -> Shift (cliente)
 * Ajusta el tipo Shift en "@/components/Shifts/types" si hace falta.
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
  };
}

/**
 * listShifts
 * Parámetros opcionales: page, search, pageSize, ordering, includeInactive
 * También aceptamos filtros directos guardId / propertyId si quieres listados más específicos.
 */
export async function listShifts(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
  includeInactive?: boolean,
  guardId?: number,
  propertyId?: number,
): Promise<PaginatedResult<Shift>> {
  const params: Record<string, unknown> = {
    page,
    page_size: pageSize ?? 10,
    ordering: ordering ?? undefined,
    include_inactive: includeInactive ? "true" : undefined,
  };

  if (search && String(search).trim() !== "") {
    params.search = String(search).trim();
  }
  if (guardId !== undefined && guardId !== null) {
    params.guard_id = guardId;
  }
  if (propertyId !== undefined && propertyId !== null) {
    params.property_id = propertyId;
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
  // Construir body explícito y sanitizado
  const body: Record<string, unknown> = {
    guard: payload.guard,
    property: payload.property,
    start_time: payload.start_time,
    end_time: payload.end_time,
  };

  if (payload.status !== undefined && payload.status !== null) {
    body.status = payload.status;
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
 */
export async function listShiftsByGuard(
  guardId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
  includeInactive?: boolean,
): Promise<PaginatedResult<Shift>> {
  return drfList<ServerShift, Shift>(
    `${endpoints.shifts}by_guard/`,
    {
      guard_id: guardId,
      page,
      page_size: pageSize ?? 10,
      ordering: ordering ?? undefined,
      include_inactive: includeInactive ? "true" : undefined,
    },
    mapServerShift,
  );
}

export async function listShiftsByProperty(
  propertyId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
  includeInactive?: boolean,
): Promise<PaginatedResult<Shift>> {
  return drfList<ServerShift, Shift>(
    `${endpoints.shifts}by_property/`,
    {
      property_id: propertyId,
      page,
      page_size: pageSize ?? 10,
      ordering: ordering ?? undefined,
      include_inactive: includeInactive ? "true" : undefined,
    },
    mapServerShift,
  );
}
