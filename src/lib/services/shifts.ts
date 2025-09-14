// src/lib/services/shifts.ts

import type { Shift } from "@/components/Shifts/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Server side shape (snake_case) según la API que compartiste
 */
type ServerShift = {
  id: number;
  guard: number;
  guard_details?: Record<string, any> | null;
  property: number;
  property_details?: Record<string, any> | null;
  service?: number | null;
  service_details?: Record<string, any> | null;

  planned_start_time?: string | null;
  planned_end_time?: string | null;

  start_time?: string | null;
  end_time?: string | null;

  hours_worked?: number | null;
  status?: string | null;

  is_armed?: boolean | null;
  weapon?: number | null;
  weapon_details?: string | null;

  // posible campo para serial si el backend lo expone/acepta
  weapon_serial_number?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  is_active?: boolean | null;
};

/**
 * Payloads para crear/actualizar
 *
 * NOTA: aquí usamos nombres tal cual el backend espera (snake_case),
 * para que puedas enviar el body exactamente como el ejemplo que pasaste.
 *
 * Agregué `weaponSerialNumber` como opción para enviar el número de serie
 * (weapon_serial_number) en caso de que prefieras enviar el serial en lugar
 * del id del arma. Muchos backends aceptan solo `weapon` id; si el tuyo
 * acepta `weapon_serial_number`, esto te permite enviarlo.
 */
export type CreateShiftPayload = {
  guard: number;
  property: number;
  service?: number | null;

  is_armed?: boolean;
  weapon?: number | null;
  weaponSerialNumber?: string | null; // -> weapon_serial_number

  planned_start_time?: string | null;
  planned_end_time?: string | null;

  start_time?: string | null;
  end_time?: string | null;

  status?: "scheduled" | "completed" | "voided" | string;
};

export type UpdateShiftPayload = Partial<CreateShiftPayload>;

/**
 * Helper: map ServerShift -> Shift (cliente, camelCase)
 */
function mapServerShift(s: ServerShift): Shift {
  return {
    id: s.id,
    guard: s.guard,
    guardDetails: s.guard_details ?? undefined,
    guardName:
      s.guard_details && (s.guard_details.name || (s.guard_details.first_name && s.guard_details.last_name))
        ? (s.guard_details.name ?? `${s.guard_details.first_name} ${s.guard_details.last_name}`)
        : undefined,
    property: s.property,
    propertyDetails: s.property_details ?? undefined,
    propertyName: s.property_details?.name ?? s.property_details?.alias ?? undefined,
    service: s.service ?? null,
    serviceDetails: s.service_details ?? undefined,

    plannedStartTime: s.planned_start_time ?? null,
    plannedEndTime: s.planned_end_time ?? null,

    startTime: s.start_time ?? null,
    endTime: s.end_time ?? null,

    hoursWorked: typeof s.hours_worked === "number" ? s.hours_worked : null,
    status: s.status ?? undefined,

    isArmed: typeof s.is_armed === "boolean" ? s.is_armed : null,
    weapon: s.weapon ?? null,
    weaponDetails: s.weapon_details ?? null,
    weaponSerialNumber: s.weapon_serial_number ?? null,

    createdAt: s.created_at ?? null,
    updatedAt: s.updated_at ?? null,

    isActive: typeof s.is_active === "boolean" ? s.is_active : undefined,
  } as Shift;
}

/**
 * KEY para react-query / cache
 */
export const SHIFTS_KEY = "shifts" as const;

/**
 * listShifts (GET /shifts/) — paginado servidor
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

  return drfList<ServerShift, Shift>(endpoints.shifts, params, mapServerShift);
}

/**
 * getShift
 */
export async function getShift(id: number): Promise<Shift> {
  const { data } = await api.get<ServerShift>(`${endpoints.shifts}${id}/`);
  return mapServerShift(data);
}

/**
 * createShift
 * Acepta un payload con claves snake_case (tal como tu ejemplo):
 * {
 *  "guard": 12,
 *  "property": 34,
 *  "is_armed": true,
 *  "weapon": 5,
 *  "weapon_serial_number": "SN-12345",
 *  "planned_start_time": "...",
 *  ...
 * }
 */
export async function createShift(payload: CreateShiftPayload): Promise<Shift> {
  // filtrar undefined para enviar sólo campos presentes
  const body: Record<string, unknown> = {};
  if (payload.guard !== undefined) body.guard = payload.guard;
  if (payload.property !== undefined) body.property = payload.property;
  if (payload.service !== undefined) body.service = payload.service;
  if (typeof payload.is_armed === "boolean") body.is_armed = payload.is_armed;
  if (payload.weapon !== undefined) body.weapon = payload.weapon;
  // enviar serial si se proporciona (campo snake_case que puede aceptar el backend)
  if (payload.weaponSerialNumber !== undefined) body.weapon_serial_number = payload.weaponSerialNumber;
  if (payload.planned_start_time !== undefined) body.planned_start_time = payload.planned_start_time;
  if (payload.planned_end_time !== undefined) body.planned_end_time = payload.planned_end_time;
  if (payload.start_time !== undefined) body.start_time = payload.start_time;
  if (payload.end_time !== undefined) body.end_time = payload.end_time;
  if (payload.status !== undefined) body.status = payload.status;

  const { data } = await api.post<ServerShift>(endpoints.shifts, body);
  return mapServerShift(data);
}

/**
 * updateShift (PATCH semantics)
 * Recibe campos en formato snake_case (UpdateShiftPayload = Partial<CreateShiftPayload>)
 */
export async function updateShift(id: number, payload: UpdateShiftPayload): Promise<Shift> {
  const body: Record<string, unknown> = {};
  if (payload.guard !== undefined) body.guard = payload.guard;
  if (payload.property !== undefined) body.property = payload.property;
  if (payload.service !== undefined) body.service = payload.service;
  if (typeof payload.is_armed === "boolean") body.is_armed = payload.is_armed;
  if (payload.weapon !== undefined) body.weapon = payload.weapon;
  if (payload.weaponSerialNumber !== undefined) body.weapon_serial_number = payload.weaponSerialNumber;
  if (payload.planned_start_time !== undefined) body.planned_start_time = payload.planned_start_time;
  if (payload.planned_end_time !== undefined) body.planned_end_time = payload.planned_end_time;
  if (payload.start_time !== undefined) body.start_time = payload.start_time;
  if (payload.end_time !== undefined) body.end_time = payload.end_time;
  if (payload.status !== undefined) body.status = payload.status;

  const { data } = await api.patch<ServerShift>(`${endpoints.shifts}${id}/`, body);
  return mapServerShift(data);
}

/**
 * deleteShift
 */
export async function deleteShift(id: number): Promise<void> {
  await api.delete(`${endpoints.shifts}${id}/`);
}

/**
 * softDeleteShift / restoreShift
 */
export async function softDeleteShift(id: number): Promise<Shift> {
  const { data } = await api.post<ServerShift>(`${endpoints.shifts}${id}/soft_delete/`, {});
  return mapServerShift(data);
}

export async function restoreShift(id: number): Promise<Shift> {
  const { data } = await api.post<ServerShift>(`${endpoints.shifts}${id}/restore/`, {});
  return mapServerShift(data);
}

/**
 * bulk endpoints
 */
export async function bulkDeleteShifts(data: unknown): Promise<unknown> {
  const { data: res } = await api.post(`${endpoints.shifts}bulk_delete/`, data);
  return res;
}

export async function bulkUpdateShifts(data: unknown): Promise<unknown> {
  const { data: res } = await api.post(`${endpoints.shifts}bulk_update/`, data);
  return res;
}

/**
 * Listados por guard/property/service según swagger:
 * - GET /shifts/by_guard/?guard_id=...
 * - GET /shifts/by_property/?property_id=...
 * - GET /shifts/by_service/?service_id=...
 *
 * drfList mapea automáticamente paginado (count, items, next, previous) usando mapServerShift.
 */
export async function listShiftsByGuard(
  guardId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
  search?: string,
): Promise<PaginatedResult<Shift>> {
  const params: Record<string, unknown> = {
    guard_id: guardId,
    page,
    page_size: pageSize ?? 10,
    ordering: ordering ?? undefined,
  };
  if (search && String(search).trim() !== "") params.search = String(search).trim();

  return drfList<ServerShift, Shift>(`${endpoints.shifts}by_guard/`, params, mapServerShift);
}

export async function listShiftsByProperty(
  propertyId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
  search?: string,
): Promise<PaginatedResult<Shift>> {
  const params: Record<string, unknown> = {
    property_id: propertyId,
    page,
    page_size: pageSize ?? 10,
    ordering: ordering ?? undefined,
  };
  if (search && String(search).trim() !== "") params.search = String(search).trim();

  return drfList<ServerShift, Shift>(`${endpoints.shifts}by_property/`, params, mapServerShift);
}

export async function listShiftsByService(
  serviceId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
  search?: string,
): Promise<PaginatedResult<Shift>> {
  const params: Record<string, unknown> = {
    service_id: serviceId,
    page,
    page_size: pageSize ?? 10,
    ordering: ordering ?? undefined,
  };
  if (search && String(search).trim() !== "") params.search = String(search).trim();

  return drfList<ServerShift, Shift>(`${endpoints.shifts}by_service/`, params, mapServerShift);
}
