/* src/lib/services/guard.ts
   Servicio de guards — ahora con tipos estrictos para cached-locations y update-location.
   Además: si cached-locations no incluye nombre, intenta completar llamando a getGuard(id).
*/

import type { Guard } from "@/components/Guards/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/* ----------------------
   Tipos del servidor / API
   ---------------------- */

type ServerGuard = {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	phone?: string | null;
	ssn?: string | null;
	address?: string | null;
	birth_date?: string | null; // ISO date string
};

export type CreateGuardPayload = {
	first_name: string;
	last_name: string;
	email: string;
	phone?: string | null | undefined;
	ssn?: string | null | undefined;
	address?: string | null | undefined;
	birth_date?: string | null | undefined;
};

export type UpdateGuardPayload = Partial<CreateGuardPayload>;

function mapServerGuard(u: ServerGuard): Guard {
	return {
		id: u.id,
		firstName: u.first_name,
		lastName: u.last_name,
		email: u.email,
		phone: u.phone ?? null,
		ssn: u.ssn ?? null,
		address: u.address ?? null,
		birthdate: u.birth_date ?? null,
	};
}

/* ----------------------
   Funciones existentes
   ---------------------- */

export async function listGuards(
	page?: number,
	search?: string,
	pageSize?: number,
	ordering?: string,
): Promise<PaginatedResult<Guard>> {
	return drfList<ServerGuard, Guard>(
		endpoints.guards,
		{
			page,
			page_size: pageSize ?? 10,
			search:
				search && String(search).trim() !== ""
					? String(search).trim()
					: undefined,
			ordering: ordering ?? undefined,
		},
		mapServerGuard,
	);
}

export const GUARDS_KEY = "guards" as const;

export async function getGuard(id: number): Promise<Guard> {
	const { data } = await api.get<ServerGuard>(`${endpoints.guards}${id}/`);
	return mapServerGuard(data);
}

export async function createGuard(payload: CreateGuardPayload): Promise<Guard> {
	const body: Record<string, unknown> = {
		first_name: payload.first_name,
		last_name: payload.last_name,
		email: payload.email,
	};

	if (
		payload.phone !== undefined &&
		payload.phone !== null &&
		payload.phone !== ""
	) {
		body.phone = payload.phone;
	}
	if (payload.ssn !== undefined && payload.ssn !== null && payload.ssn !== "") {
		body.ssn = payload.ssn;
	}
	if (
		payload.address !== undefined &&
		payload.address !== null &&
		payload.address !== ""
	) {
		body.address = payload.address;
	}
	if (
		payload.birth_date !== undefined &&
		payload.birth_date !== null &&
		payload.birth_date !== ""
	) {
		body.birth_date = payload.birth_date;
	}

	// Defender: nunca enviar user
	if ("user" in body) {
		delete (body as any).user;
	}

	const { data } = await api.post<ServerGuard>(endpoints.guards, body);
	return mapServerGuard(data);
}

export async function updateGuard(
	id: number,
	payload: UpdateGuardPayload,
): Promise<Guard> {
	const body: Record<string, unknown> = {};

	if (payload.first_name !== undefined && payload.first_name !== null) {
		body.first_name = payload.first_name;
	}
	if (payload.last_name !== undefined && payload.last_name !== null) {
		body.last_name = payload.last_name;
	}
	if (payload.email !== undefined && payload.email !== null) {
		body.email = payload.email;
	}
	if (payload.phone !== undefined) {
		if (payload.phone === "") {
			// omitimos cadena vacía
		} else {
			body.phone = payload.phone;
		}
	}
	if (payload.ssn !== undefined) {
		if (payload.ssn === "") {
			// omitimos cadena vacía
		} else {
			body.ssn = payload.ssn;
		}
	}
	if (payload.address !== undefined) {
		if (payload.address === "") {
			// omitimos cadena vacía
		} else {
			body.address = payload.address;
		}
	}
	if (payload.birth_date !== undefined) {
		if (payload.birth_date === "") {
			// omitimos cadena vacía
		} else {
			body.birth_date = payload.birth_date;
		}
	}

	// Defender: nunca enviar user
	if ("user" in body) {
		delete (body as any).user;
	}

	const { data } = await api.patch<ServerGuard>(
		`${endpoints.guards}${id}/`,
		body,
	);
	return mapServerGuard(data);
}

export async function deleteGuard(id: number): Promise<void> {
	await api.delete(`${endpoints.guards}${id}/`);
}

/* ----------------------
   Nuevas funciones: locations
   ---------------------- */

/**
 * GuardLocation - tipo normalizado que usará la UI
 */
export type GuardLocation = {
	guardId: number;
	lat: number;
	lon: number;
	isOnShift: boolean;
	lastUpdated: string; // ISO string o vacío
	propertyId?: number | null;
	propertyName?: string | null;
	name?: string | null;
};

/**
 * Tipos auxiliares para la respuesta del endpoint cached-locations
 */
type RawPossibleScalar = string | number | boolean | null;
type RawPossibleArray = Array<RawPossibleScalar>;
type RawLocationObject = {
	[key: string]: RawPossibleScalar | RawPossibleArray | RawLocationObject | undefined;
};

type CachedLocationsResponse = {
	success: boolean;
	data: Record<string, RawLocationObject> | RawLocationObject[] | object;
	total_guards?: number;
};

/* ----------------------
   Helpers de parseo / type-guards
   ---------------------- */

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}
function firstOf(x: unknown): RawPossibleScalar | undefined {
	if (Array.isArray(x)) return x.length > 0 ? x[0] : undefined;
	return x as RawPossibleScalar | undefined;
}
function toNumber(n: unknown): number | undefined {
	const s = firstOf(n);
	if (s === undefined || s === null) return undefined;
	const num = Number(s);
	return Number.isFinite(num) ? num : undefined;
}
function toBoolean(v: unknown): boolean {
	const f = firstOf(v);
	if (typeof f === "boolean") return f;
	if (typeof f === "number") return f !== 0;
	if (typeof f === "string") {
		const s = f.trim().toLowerCase();
		return s === "true" || s === "1" || s === "yes";
	}
	return false;
}
function toStringSafe(v: unknown): string {
	const f = firstOf(v);
	if (f === undefined || f === null) return "";
	return String(f);
}

/**
 * Extrae un nombre legible desde formas comunes que puede devolver el backend.
 * Maneja:
 * - string directo
 * - array con primer elemento string
 * - objeto con fields: name, guard_name, full_name, display_name
 * - objeto con first_name + last_name
 * - objeto anidado guard: { first_name, last_name }
 */
function extractName(raw: unknown): string | null {
	if (raw === undefined || raw === null) return null;

	// si es string simple
	if (typeof raw === "string") {
		const s = raw.trim();
		return s === "" ? null : s;
	}

	// si es array, tomar primer elemento (si es string/number)
	if (Array.isArray(raw)) {
		const f = raw.length > 0 ? raw[0] : undefined;
		if (typeof f === "string") {
			const s = f.trim();
			return s === "" ? null : s;
		}
		if (typeof f === "number") return String(f);
		// si fuese objeto, intentar extraer de él recursivamente
		if (isObject(f)) return extractName(f);
		return null;
	}

	// si es objeto, probar campos comunes
	if (isObject(raw)) {
		const anyRaw = raw as Record<string, any>;

		const tryCandidates = (c: unknown) => {
			if (c === undefined || c === null) return null;
			if (typeof c === "string") {
				const s = c.trim();
				return s === "" ? null : s;
			}
			if (typeof c === "number") return String(c);
			if (Array.isArray(c) && c.length > 0) {
				const f = c[0];
				if (typeof f === "string") {
					const s = f.trim();
					return s === "" ? null : s;
				}
				if (typeof f === "number") return String(f);
			}
			if (isObject(c)) {
				// try nested first/last
				const fn = c.first_name ?? c.firstName ?? c.guard_first_name;
				const ln = c.last_name ?? c.lastName ?? c.guard_last_name;
				if ((fn || ln) && (typeof fn === "string" || typeof ln === "string")) {
					return `${String(fn ?? "").trim()} ${String(ln ?? "").trim()}`.trim() || null;
				}
				// try name-like inside nested
				const nm = c.name ?? c.guard_name ?? c.full_name ?? c.display_name;
				if (nm) {
					return tryCandidates(nm);
				}
			}
			return null;
		};

		// orden de preferencia
		const candidates = [
			anyRaw.name,
			anyRaw.guard_name,
			anyRaw.full_name,
			anyRaw.display_name,
			anyRaw.guard?.full_name,
			anyRaw.guard?.name,
			anyRaw.guard?.guard_name,
			anyRaw.guard?.first_name && anyRaw.guard?.last_name
				? `${anyRaw.guard.first_name} ${anyRaw.guard.last_name}`
				: undefined,
			anyRaw.first_name && anyRaw.last_name ? `${anyRaw.first_name} ${anyRaw.last_name}` : undefined,
			anyRaw.first_name,
			anyRaw.last_name,
			anyRaw.guard_first_name && anyRaw.guard_last_name
				? `${anyRaw.guard_first_name} ${anyRaw.guard_last_name}`
				: undefined,
		];

		for (const c of candidates) {
			const v = tryCandidates(c);
			if (v) return v;
		}
	}

	return null;
}

/**
 * getCachedGuardLocations
 *
 * Nota: si la respuesta cached-locations no incluye nombre para un guard,
 * este método tratará de completar el nombre llamando a getGuard(id).
 */
export async function getCachedGuardLocations(opts?: {
	page?: number;
	pageSize?: number;
	search?: string;
	ordering?: string;
	guardId?: number;
}): Promise<{ locations: GuardLocation[]; totalGuards: number }> {
	const params: Record<string, unknown> = {
		page: opts?.page,
		page_size: opts?.pageSize ?? undefined,
		search:
			opts?.search && String(opts?.search).trim() !== ""
				? String(opts?.search).trim()
				: undefined,
		ordering: opts?.ordering ?? undefined,
	};

	if (opts?.guardId !== undefined && opts?.guardId !== null) {
		(params as any).guard_id = opts!.guardId;
	}

	const { data } = await api.get<CachedLocationsResponse>(
		`${endpoints.guards}cached-locations/`,
		{ params },
	);

	const raw = data?.data ?? {};
	const total = typeof data?.total_guards === "number" ? data.total_guards : 0;
	const locations: GuardLocation[] = [];

	// Si raw es un arreglo de objetos
	if (Array.isArray(raw)) {
		for (const entry of raw) {
			if (!isObject(entry)) continue;
			const lat = toNumber(entry.lat ?? entry.latitude ?? entry[0]);
			const lon = toNumber(entry.lon ?? entry.longitude ?? entry[1]);
			if (lat === undefined || lon === undefined) continue;

			const guardIdRaw = entry.guard_id ?? entry.id ?? entry.guard?.id;
			const guardId = guardIdRaw ? Number(firstOf(guardIdRaw)) : -1;

			const name = extractName(entry) ?? extractName(entry.guard) ?? null;

			locations.push({
				guardId: Number.isFinite(guardId) ? guardId : -1,
				lat,
				lon,
				isOnShift: toBoolean(entry.is_on_shift ?? entry.on_shift ?? entry.onShift),
				lastUpdated: toStringSafe(entry.last_updated ?? entry.updated_at ?? entry.updatedAt ?? ""),
				propertyId:
					toNumber(entry.property_id ?? entry.property ?? null) ?? null,
				propertyName: toStringSafe(entry.property_name ?? entry.property ?? null) || null,
				name,
			});
		}
	} else if (isObject(raw)) {
		// raw es objeto mapeado por guard id => value
		for (const [key, value] of Object.entries(raw)) {
			// value puede ser object o array o scalar
			if (Array.isArray(value)) {
				// cada elemento puede ser objeto con lat/lon
				for (const v of value) {
					if (!isObject(v)) continue;
					const lat = toNumber(v.lat ?? v.latitude ?? v[0]);
					const lon = toNumber(v.lon ?? v.longitude ?? v[1]);
					if (lat === undefined || lon === undefined) continue;
					const guardId = Number(key) || Number(firstOf(v.guard_id ?? v.id ?? key));
					const name = extractName(v) ?? extractName(v.guard) ?? extractName(key) ?? null;
					locations.push({
						guardId: Number.isFinite(guardId) ? guardId : -1,
						lat,
						lon,
						isOnShift: toBoolean(v.is_on_shift ?? v.on_shift ?? v.onShift),
						lastUpdated: toStringSafe(v.last_updated ?? v.updated_at ?? v.updatedAt ?? ""),
						propertyId: toNumber(v.property_id ?? v.property ?? null) ?? null,
						propertyName:
							toStringSafe(v.property_name ?? v.property ?? null) || null,
						name,
					});
				}
			} else if (isObject(value)) {
				const lat = toNumber(value.lat ?? value.latitude ?? value[0]);
				const lon = toNumber(value.lon ?? value.longitude ?? value[1]);
				if (lat === undefined || lon === undefined) continue;
				const guardIdCandidate = Number(firstOf(value.guard_id ?? value.id ?? key));
				const guardId = Number.isFinite(guardIdCandidate) ? guardIdCandidate : Number(key) || -1;
				const name = extractName(value) ?? extractName(value.guard) ?? null;

				locations.push({
					guardId,
					lat,
					lon,
					isOnShift: toBoolean(value.is_on_shift ?? value.on_shift ?? value.onShift),
					lastUpdated: toStringSafe(value.last_updated ?? value.updated_at ?? value.updatedAt ?? ""),
					propertyId: toNumber(value.property_id ?? value.property ?? null) ?? null,
					propertyName: toStringSafe(value.property_name ?? value.property ?? null) || null,
					name,
				});
			} else {
				// si value no es objeto, intentamos parsear campos simples si existen (no muy común)
				continue;
			}
		}
	}

	// Si hay localizaciones sin nombre, intentar completar pidiendo getGuard(id)
	try {
		const idsToFetch = Array.from(
			new Set(
				locations
					.filter((l) => !l.name || String(l.name).trim() === "")
					.map((l) => l.guardId)
					.filter((id) => Number.isFinite(id) && id > 0),
			),
		);

		if (idsToFetch.length > 0) {
			// parallel requests but no failing the whole flow
			const promises = idsToFetch.map((id) =>
				getGuard(id).then(
					(g) => ({ id, name: `${g.firstName ?? ""} ${g.lastName ?? ""}`.trim() || null }),
					(err) => {
						// no hacer throw, solo retornamos null
						console.warn(`getGuard(${id}) failed:`, err);
						return { id, name: null };
					},
				),
			);

			const results = await Promise.all(promises);
			for (const r of results) {
				if (r && r.name) {
					for (const loc of locations) {
						if (loc.guardId === r.id && (!loc.name || String(loc.name).trim() === "")) {
							loc.name = r.name;
						}
					}
				}
			}
		}
	} catch (err) {
		// no bloquear si algo falla aquí
		console.warn("Error fetching guard names for cached locations:", err);
	}

	return {
		locations,
		totalGuards: total,
	};
}

/* ----------------------
   update-location
   ---------------------- */

export type UpdateLocationPayload = {
	lat: string | number;
	lon: string | number;
	is_on_shift: boolean;
	property_id?: number | null;
	property_name?: string | null;
};

export type UpdateLocationResponse = {
	success: boolean;
	message?: string;
	guard_id?: number;
	last_updated?: string;
};

export async function updateGuardLocation(
	guardId: number,
	payload: UpdateLocationPayload,
): Promise<UpdateLocationResponse> {
	const body: Record<string, unknown> = {
		lat: String(payload.lat),
		lon: String(payload.lon),
		is_on_shift: payload.is_on_shift,
	};

	if (payload.property_id !== undefined) {
		body.property_id = payload.property_id;
	}
	if (payload.property_name !== undefined) {
		body.property_name = payload.property_name;
	}

	const { data } = await api.post<{ success: boolean; message?: string; guard_id?: number; last_updated?: string }>(
		`${endpoints.guards}update-location/`,
		body,
		{ params: { guard_id: guardId } },
	);

	return {
		success: Boolean(data?.success ?? false),
		message: data?.message,
		guard_id: data?.guard_id,
		last_updated: data?.last_updated,
	};
}
