import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";
/* import { generateSort, type SortOrder } from "../sort"; */

/**
 * Tipado del cliente (owner_details) según el swagger que pegaste.
 */
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

/**
 * Server shape según Swagger (snake_case)
 */
type ServerProperty = {
	id: number;
	owner: number;
	owner_details?: ServerClient;
	name?: string | null;
	alias?: string | null;
	address: string;
	types_of_service?: number[];
	monthly_rate?: string | null;
	contract_start_date?: string | null;
	total_hours?: number | null;
	created_at?: string | null;
	updated_at?: string | null;
};

/**
 * Shape usado en frontend — cámbialo por tu tipo UI si ya existe
 */
export type AppProperty = {
	id: number;
	ownerId: number;
	ownerDetails?: ServerClient;
	name?: string;
	alias?: string;
	address: string;
	typesOfService: number[];
	// mantengo monthlyRate como string (según el esquema)
	monthlyRate?: string | null;
	contractStartDate?: string | null;
	totalHours?: number | null;
	createdAt?: string | null;
	updatedAt?: string | null;
};

export type CreatePropertyPayload = {
	// el swagger del POST pide owner_details con user y phone (puede también aceptarse "owner")
	owner?: number;
	owner_details?: { user: number; phone?: string };
	name?: string | null;
	alias?: string | null;
	address: string;
	phone?: string | null;
	types_of_service?: number[];
	// monthly_rate como string, como en el esquema
	monthly_rate?: string | null;
	contract_start_date?: string | null;
	total_hours?: number | null;
};

export type UpdatePropertyPayload = Partial<CreatePropertyPayload>;

export const PROPERTY_KEY = "properties" as const;
export const PROPERTY_TYPES_KEY = "property-types-of-service" as const;

function mapServerProperty(p: ServerProperty): AppProperty {
	return {
		id: p.id,
		ownerId: p.owner,
		ownerDetails: p.owner_details,
		name: p.name ?? undefined,
		alias: p.alias ?? undefined,
		address: p.address,
		typesOfService: Array.isArray(p.types_of_service) ? p.types_of_service : [],
		// mantenemos monthly_rate como string (no convertir a number)
		monthlyRate: p.monthly_rate ?? undefined,
		contractStartDate: p.contract_start_date ?? undefined,
		totalHours: p.total_hours ?? undefined,
		createdAt: p.created_at ?? undefined,
		updatedAt: p.updated_at ?? undefined,
	};
}

/* -------------------------------------------------------------------------- */
/* Listados / CRUD globales (/api/properties/)                                 */
/* -------------------------------------------------------------------------- */
export async function listProperties(
  page?: number,
  search?: string,
  pageSize: number = 10,
  ordering?: string, // ahora recibe ordering string (ej "owner" | "-name")
): Promise<PaginatedResult<AppProperty>> {
  return drfList<ServerProperty, AppProperty>(
    endpoints.properties,
    {
      page,
      page_size: pageSize,
      search:
        search && String(search).trim() !== "" ? String(search).trim() : undefined,
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

export async function createProperty(
	payload: CreatePropertyPayload,
): Promise<AppProperty> {
	const { data } = await api.post<ServerProperty>(
		endpoints.properties,
		payload,
	);
	return mapServerProperty(data);
}

export async function updateProperty(
	id: number,
	payload: UpdatePropertyPayload,
): Promise<AppProperty> {
	const url = `${endpoints.properties}${id}/`;
	const { data } = await api.put<ServerProperty>(url, payload);
	return mapServerProperty(data);
}

export async function partialUpdateProperty(
	id: number,
	payload: UpdatePropertyPayload,
): Promise<AppProperty> {
	const url = `${endpoints.properties}${id}/`;
	const { data } = await api.patch<ServerProperty>(url, payload);
	return mapServerProperty(data);
}

export async function deleteProperty(id: number): Promise<void> {
	const url = `${endpoints.properties}${id}/`;
	await api.delete(url);
}

/* -------------------------------------------------------------------------- */
/* Bulk operations                                                             */
/* -------------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------- */
/* Endpoints adicionales por property id                                        */
/* -------------------------------------------------------------------------- */
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

export async function restoreProperty(
	id: number,
	payload: object = {},
): Promise<AppProperty> {
	const url = `${endpoints.properties}${id}/restore/`;
	const { data } = await api.post<ServerProperty>(url, payload);
	return mapServerProperty(data);
}

export async function softDeleteProperty(
	id: number,
	payload: object = {},
): Promise<AppProperty> {
	const url = `${endpoints.properties}${id}/soft_delete/`;
	const { data } = await api.post<ServerProperty>(url, payload);
	return mapServerProperty(data);
}

/* -------------------------------------------------------------------------- */
/* Property types of service                                                    */
/* -------------------------------------------------------------------------- */
const PROPERTY_TYPES_BASE = endpoints.propertyTypesOfService;

type ServerPropertyType = { id: number; name: string };
export type AppPropertyType = { id: number; name: string };

export async function listPropertyTypesOfService(
	page?: number,
	pageSize: number = 50,
): Promise<PaginatedResult<AppPropertyType>> {
	return drfList<ServerPropertyType, AppPropertyType>(
		PROPERTY_TYPES_BASE,
		{ page, page_size: pageSize },
		(t) => ({ id: t.id, name: t.name }),
	);
}

export async function getPropertyTypeOfService(
	id: number,
): Promise<AppPropertyType> {
	const url = `${PROPERTY_TYPES_BASE}${id}/`;
	const { data } = await api.get<ServerPropertyType>(url);
	return { id: data.id, name: data.name };
}
