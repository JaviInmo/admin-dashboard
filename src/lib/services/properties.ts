import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/* ------------------ Tipado cliente según Swagger ------------------ */
type ServerClient = {
  id: number;
  user: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  balance?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
};

/* ------------------ Forma que devuelve el servidor (snake_case) ------------------ */
type ServerProperty = {
  id: number;
  owner: number;
  owner_details?: ServerClient;
  name?: string | null;
  alias?: string | null;
  address: string;
  description?: string | null;
  contract_start_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // campos de detalle de solo lectura (si los devuelve el backend)
  shifts_count?: number | string;
  expenses_count?: number | string;
  total_expenses_amount?: string | null;
};

/* ------------------ Tipo usado en frontend (camelCase) ------------------ */
export type AppProperty = {
  id: number;
  ownerId: number;
  ownerDetails?: ServerClient;
  name?: string;
  alias?: string;
  address: string;
  description?: string | null;
  contractStartDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  shiftsCount?: number | string;
  expensesCount?: number | string;
  totalExpensesAmount?: string | null;
};

/* ------------------ Payloads para crear / actualizar ------------------ */
/* El nuevo swagger indica que el POST/PUT/PATCH solo espera los campos:
   owner (opcional para clientes), address (required), alias, name, contract_start_date, description */
export type CreatePropertyPayload = {
  owner?: number;
  name?: string | null;
  alias?: string | null;
  address: string;
  contract_start_date?: string | null;
  description?: string | null;
};

export type UpdatePropertyPayload = Partial<CreatePropertyPayload>;

export const PROPERTY_KEY = "properties" as const;
export const PROPERTY_TYPES_KEY = "property-types-of-service" as const;

/* ------------------ Utilidad para mapear y sanear ------------------ */
function mapServerProperty(p: ServerProperty): AppProperty {
  return {
    id: p.id,
    ownerId: p.owner,
    ownerDetails: p.owner_details,
    name: p.name ?? undefined,
    alias: p.alias ?? undefined,
    address: p.address,
    description: p.description ?? undefined,
    contractStartDate: p.contract_start_date ?? undefined,
    createdAt: p.created_at ?? undefined,
    updatedAt: p.updated_at ?? undefined,
    shiftsCount: p.shifts_count,
    expensesCount: p.expenses_count,
    totalExpensesAmount: p.total_expenses_amount ?? undefined,
  };
}

/* Evita enviar campos que la API ya no acepta */
const ALLOWED_KEYS_CREATE = [
  "owner",
  "name",
  "alias",
  "address",
  "contract_start_date",
  "description",
] as const;

function pickAllowed<T extends Record<string, any>>(payload: T, allowed: readonly string[]) {
  const out: Record<string, any> = {};
  for (const k of allowed) {
    if (k in payload) {
      // preserve explicit nulls; undefined will be sent only if explicitly present
      out[k] = (payload as any)[k];
    }
  }
  return out;
}

/* ------------------ CRUD y listados ------------------ */
export async function listProperties(
  page?: number,
  search?: string,
  pageSize: number = 10,
  ordering?: string,
): Promise<PaginatedResult<AppProperty>> {
  return drfList<ServerProperty, AppProperty>(
    endpoints.properties,
    {
      page,
      page_size: pageSize,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerProperty,
  );
}

export async function getProperty(id: number): Promise<AppProperty> {
  const url = `${endpoints.properties}${id}/`;
  const { data } = await api.get<ServerProperty>(url);
  return mapServerProperty(data);
}

export async function createProperty(payload: CreatePropertyPayload): Promise<AppProperty> {
  const body = pickAllowed(payload, ALLOWED_KEYS_CREATE);
  const { data } = await api.post<ServerProperty>(endpoints.properties, body);
  return mapServerProperty(data);
}

export async function updateProperty(id: number, payload: UpdatePropertyPayload): Promise<AppProperty> {
  const url = `${endpoints.properties}${id}/`;
  const body = pickAllowed(payload, ALLOWED_KEYS_CREATE);
  const { data } = await api.put<ServerProperty>(url, body);
  return mapServerProperty(data);
}

export async function partialUpdateProperty(id: number, payload: UpdatePropertyPayload): Promise<AppProperty> {
  const url = `${endpoints.properties}${id}/`;
  const body = pickAllowed(payload, ALLOWED_KEYS_CREATE);
  const { data } = await api.patch<ServerProperty>(url, body);
  return mapServerProperty(data);
}

export async function deleteProperty(id: number): Promise<void> {
  const url = `${endpoints.properties}${id}/`;
  await api.delete(url);
}

/* ------------------ Bulk operations (dejé endpoints como estaban) ------------------ */
export async function bulkDeleteProperties(payload: object): Promise<any> {
  const url = `${endpoints.properties}bulk_delete/`;
  const { data } = await api.post(url, payload);
  return data;
}

export async function bulkUpdateProperties(payload: object): Promise<any> {
  const url = `${endpoints.properties}bulk_update/`;
  const { data } = await api.post(url, payload);
  return data;
}

/* ------------------ Endpoints por property id ------------------ */
export async function getPropertyExpenses(id: number): Promise<any[]> {
  const url = `${endpoints.properties}${id}/expenses/`;
  const { data } = await api.get<any>(url);
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export async function getPropertyShifts(id: number): Promise<any[]> {
  const url = `${endpoints.properties}${id}/shifts/`;
  const { data } = await api.get<any>(url);
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export async function restoreProperty(id: number, payload: object = {}): Promise<AppProperty> {
  const url = `${endpoints.properties}${id}/restore/`;
  const { data } = await api.post<ServerProperty>(url, payload);
  return mapServerProperty(data);
}

export async function softDeleteProperty(id: number, payload: object = {}): Promise<AppProperty> {
  const url = `${endpoints.properties}${id}/soft_delete/`;
  const { data } = await api.post<ServerProperty>(url, payload);
  return mapServerProperty(data);
}

/* ------------------ Property types (si lo usas, lo dejo intacto) ------------------ */
const PROPERTY_TYPES_BASE = endpoints.propertyTypesOfService;

type ServerPropertyType = { id: number; name: string };
export type AppPropertyType = { id: number; name: string };

export async function listPropertyTypesOfService(page?: number, pageSize: number = 50): Promise<PaginatedResult<AppPropertyType>> {
  return drfList<ServerPropertyType, AppPropertyType>(
    PROPERTY_TYPES_BASE,
    { page, page_size: pageSize },
    (t) => ({ id: t.id, name: t.name }),
  );
}

export async function getPropertyTypeOfService(id: number): Promise<AppPropertyType> {
  const url = `${PROPERTY_TYPES_BASE}${id}/`;
  const { data } = await api.get<ServerPropertyType>(url);
  return { id: data.id, name: data.name };
}
