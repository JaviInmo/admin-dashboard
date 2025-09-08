// src/lib/services/shifts.ts
import type { Shift, GuardDetails, PropertyDetails, ServiceDetails, UserShort } from "@/components/Shifts/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Server side shape (snake_case) según la API que compartiste
 */
type ServerShift = {
  id: number;
  guard: number;
  guard_details?: Record<string, any>;
  property: number;
  property_details?: Record<string, any>;
  service?: number | null;
  service_details?: Record<string, any>;
  start_time: string; // ISO
  end_time: string; // ISO
  status: string;
  hours_worked?: number;
  is_armed?: boolean;
  weapon_details?: string;
  is_active?: boolean;
};

/**
 * Payloads para crear/actualizar
 */
export type CreateShiftPayload = {
  guard: number;
  property: number;
  service?: number | null;
  start_time: string; // ISO
  end_time: string; // ISO
  status?: "scheduled" | "completed" | "voided" | string;
  is_armed?: boolean;
};

export type UpdateShiftPayload = Partial<CreateShiftPayload>;

/**
 * Helpers de mapeo
 */
function mapUserShort(u: any): UserShort | undefined {
  if (!u || typeof u !== "object") return undefined;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.first_name ?? u.firstName,
    lastName: u.last_name ?? u.lastName,
    isActive: typeof u.is_active === "boolean" ? u.is_active : undefined,
    isStaff: typeof u.is_staff === "boolean" ? u.is_staff : undefined,
    isSuperuser: typeof u.is_superuser === "boolean" ? u.is_superuser : undefined,
    dateJoined: u.date_joined ?? u.dateJoined,
    lastLogin: u.last_login ?? u.lastLogin,
  };
}

function mapGuardDetails(g: any): GuardDetails | undefined {
  if (!g || typeof g !== "object") return undefined;
  return {
    id: g.id,
    user: g.user,
    userDetails: mapUserShort(g.user_details),
    firstName: g.first_name ?? g.firstName,
    lastName: g.last_name ?? g.lastName,
    name: g.name,
    email: g.email,
    birthDate: g.birth_date ?? g.birthDate,
    phone: g.phone,
    ssn: g.ssn,
    address: g.address,
  };
}

function mapClientBrief(c: any) {
  if (!c || typeof c !== "object") return undefined;
  return {
    id: c.id,
    user: c.user,
    firstName: c.first_name ?? c.firstName,
    lastName: c.last_name ?? c.lastName,
    email: c.email,
    phone: c.phone,
    balance: c.balance,
    createdAt: c.created_at ?? c.createdAt,
    updatedAt: c.updated_at ?? c.updatedAt,
    isActive: typeof c.is_active === "boolean" ? c.is_active : undefined,
  };
}

function mapPropertyDetails(p: any): PropertyDetails | undefined {
  if (!p || typeof p !== "object") return undefined;
  return {
    id: p.id,
    owner: p.owner,
    ownerDetails: mapClientBrief(p.owner_details),
    name: p.name,
    alias: p.alias,
    address: p.address,
    description: p.description,
  };
}

function normalizeScheduleArray(sch: any): string[] | null {
  if (!Array.isArray(sch)) return null;
  return sch.map((it) => {
    if (typeof it === "string") return it;
    if (it && typeof it === "object") {
      if ("date" in it && it.date) return String(it.date);
      if ("start" in it && it.start) return String(it.start);
      if ("schedule" in it && it.schedule) return String(it.schedule);
      try {
        return JSON.stringify(it);
      } catch {
        return String(it);
      }
    }
    return String(it);
  });
}

function mapServiceDetails(s: any): ServiceDetails | undefined {
  if (!s || typeof s !== "object") return undefined;
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    guard: s.guard ?? null,
    guardName: s.guard_name ?? s.guardName,
    assignedProperty: s.assigned_property ?? s.assignedProperty,
    propertyName: s.property_name ?? s.propertyName,
    rate: s.rate,
    monthlyBudget: s.monthly_budget ?? s.monthlyBudget,
    contractStartDate: s.contract_start_date ?? s.contractStartDate,
    schedule: normalizeScheduleArray(s.schedule ?? s.schedules ?? null),
    recurrent: typeof s.recurrent === "boolean" ? s.recurrent : null,
    totalHours: s.total_hours ?? s.totalHours,
    createdAt: s.created_at ?? s.createdAt,
    updatedAt: s.updated_at ?? s.updatedAt,
    isActive: typeof s.is_active === "boolean" ? s.is_active : undefined,
  };
}

/**
 * Mapea ServerShift -> Shift (cliente)
 */
function mapServerShift(s: ServerShift): Shift {
  return {
    id: s.id,
    guard: s.guard,
    guardDetails: mapGuardDetails(s.guard_details),
    guardName:
      // si el backend provee guard_details.name o guard_details.first_name + last_name, priorizamos eso
      (s.guard_details && (s.guard_details.name || (s.guard_details.first_name && s.guard_details.last_name)))
        ? (s.guard_details.name ?? `${s.guard_details.first_name} ${s.guard_details.last_name}`)
        : undefined,
    property: s.property,
    propertyDetails: mapPropertyDetails(s.property_details),
    propertyName: s.property_details?.name ?? s.property_details?.alias ?? undefined,
    service: s.service ?? null,
    serviceDetails: mapServiceDetails(s.service_details),

    startTime: s.start_time,
    endTime: s.end_time,

    status: s.status ?? "scheduled",
    hoursWorked: typeof s.hours_worked === "number" ? s.hours_worked : undefined,

    isActive: typeof s.is_active === "boolean" ? s.is_active : undefined,
    isArmed: typeof s.is_armed === "boolean" ? s.is_armed : undefined,
    weaponDetails: s.weapon_details,
  } as Shift;
}

/**
 * listShifts
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

  if (payload.service !== undefined) body.service = payload.service;
  if (payload.status !== undefined) body.status = payload.status;
  if (typeof payload.is_armed === "boolean") body.is_armed = payload.is_armed;

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
  if (payload.service !== undefined) {
    body.service = payload.service;
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
  if (typeof payload.is_armed === "boolean") {
    body.is_armed = payload.is_armed;
  }

  const { data } = await api.patch<ServerShift>(`${endpoints.shifts}${id}/`, body);
  return mapServerShift(data);
}

export async function deleteShift(id: number): Promise<void> {
  await api.delete(`${endpoints.shifts}${id}/`);
}

/**
 * Acciones custom
 */
export async function softDeleteShift(id: number): Promise<Shift> {
  const { data } = await api.post<ServerShift>(`${endpoints.shifts}${id}/soft_delete/`);
  return mapServerShift(data);
}

export async function restoreShift(id: number): Promise<Shift> {
  const { data } = await api.post<ServerShift>(`${endpoints.shifts}${id}/restore/`);
  return mapServerShift(data);
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
 * Bulk endpoints (genéricos)
 */
export async function bulkDeleteShifts(data: unknown): Promise<unknown> {
  const { data: res } = await api.post(`${endpoints.shifts}bulk_delete/`, data);
  return res;
}

export async function bulkUpdateShifts(data: unknown): Promise<unknown> {
  const { data: res } = await api.post(`${endpoints.shifts}bulk_update/`, data);
  return res;
}
