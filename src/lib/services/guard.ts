/* src/lib/services/guard.ts
   Servicio de guards — tipos estrictos + normalización robusta para cached-locations y update-location.
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
   CRUD de Guards
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

	if (payload.phone) body.phone = payload.phone;
	if (payload.ssn) body.ssn = payload.ssn;
	if (payload.address) body.address = payload.address;
	if (payload.birth_date) body.birth_date = payload.birth_date;

	const { data } = await api.post<ServerGuard>(endpoints.guards, body);
	return mapServerGuard(data);
}

export async function updateGuard(
	id: number,
	payload: UpdateGuardPayload,
): Promise<Guard> {
	const body: Record<string, unknown> = {};

	if (payload.first_name) body.first_name = payload.first_name;
	if (payload.last_name) body.last_name = payload.last_name;
	if (payload.email) body.email = payload.email;
	if (payload.phone) body.phone = payload.phone;
	if (payload.ssn) body.ssn = payload.ssn;
	if (payload.address) body.address = payload.address;
	if (payload.birth_date) body.birth_date = payload.birth_date;

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
   Tipos auxiliares para locations
   ---------------------- */

export type GuardLocation = {
	guardId: number;
	lat: number;
	lon: number;
	isOnShift: boolean;
	lastUpdated: string;
	propertyId?: number | null;
	propertyName?: string | null;
	name?: string | null;
	phone?: string | null;
};

type RawPossibleScalar = string | number | boolean | null;
type RawPossibleArray = Array<RawPossibleScalar>;
export type RawLocationObject = {
	[key: string]: RawPossibleScalar | RawPossibleArray | RawLocationObject | undefined;
};

type CachedLocationsResponse = {
	success: boolean;
	data: Record<string, RawLocationObject> | RawLocationObject[] | object;
	total_guards?: number;
};

/* ----------------------
   Helpers de parseo
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

/* Extrae nombre legible de múltiples formatos */
function extractName(raw: unknown): string | null {
	if (raw === undefined || raw === null) return null;

	if (typeof raw === "string") {
		const s = raw.trim();
		return s === "" ? null : s;
	}

	if (Array.isArray(raw)) {
		const f = raw[0];
		if (typeof f === "string") return f.trim() || null;
		if (typeof f === "number") return String(f);
		if (isObject(f)) return extractName(f);
		return null;
	}

	if (isObject(raw)) {
		const anyRaw = raw as Record<string, unknown>;
		const candidates = [
			anyRaw["name"],
			anyRaw["guard_name"],
			anyRaw["full_name"],
			anyRaw["display_name"],
			anyRaw["first_name"] &&
			anyRaw["last_name"]
				? `${anyRaw["first_name"]} ${anyRaw["last_name"]}`
				: undefined,
		];
		for (const c of candidates) {
			const s = toStringSafe(c);
			if (s.trim()) return s.trim();
		}
	}
	return null;
}

/* ----------------------
   getCachedGuardLocations
   ---------------------- */

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
		(params as Record<string, unknown>)["guard_id"] = opts.guardId;
	}

	const { data } = await api.get<CachedLocationsResponse>(
		`${endpoints.guards}cached-locations/`,
		{ params },
	);

	const raw = data?.data ?? {};
	const total = typeof data?.total_guards === "number" ? data.total_guards : 0;
	const locations: GuardLocation[] = [];

	if (Array.isArray(raw)) {
		for (const entry of raw as RawLocationObject[]) {
			if (!isObject(entry)) continue;

			const lat = toNumber(entry["lat"] ?? entry["latitude"] ?? entry[0]);
			const lon = toNumber(entry["lon"] ?? entry["longitude"] ?? entry[1]);
			if (lat === undefined || lon === undefined) continue;

			const guardField = entry["guard"];
			const guardIdRaw =
				entry["guard_id"] ??
				entry["id"] ??
				(isObject(guardField)
					? (guardField as RawLocationObject)["id"]
					: undefined);

			const guardId = guardIdRaw ? Number(firstOf(guardIdRaw)) : -1;
			const name =
				extractName(entry) ??
				extractName(guardField) ??
				extractName(entry["guard"] ?? null) ??
				null;

			locations.push({
				guardId: Number.isFinite(guardId) ? guardId : -1,
				lat,
				lon,
				isOnShift: toBoolean(
					entry["is_on_shift"] ?? entry["on_shift"] ?? entry["onShift"],
				),
				lastUpdated: toStringSafe(
					entry["last_updated"] ??
						entry["updated_at"] ??
						entry["updatedAt"] ??
						"",
				),
				propertyId:
					toNumber(entry["property_id"] ?? entry["property"] ?? null) ??
					null,
				propertyName:
					toStringSafe(
						entry["property_name"] ?? entry["property"] ?? null,
					) || null,
				name,
				phone: null,
			});
		}
	} else if (isObject(raw)) {
		const rawObj = raw as Record<
			string,
			RawLocationObject | RawPossibleArray | RawPossibleScalar | undefined
		>;

		for (const [key, value] of Object.entries(rawObj)) {
			if (Array.isArray(value)) {
				for (const v of value as unknown as RawLocationObject[]) {
					if (!isObject(v)) continue;

					const lat = toNumber(v["lat"] ?? v["latitude"] ?? v[0]);
					const lon = toNumber(v["lon"] ?? v["longitude"] ?? v[1]);
					if (lat === undefined || lon === undefined) continue;

					const guardId =
						Number(key) ||
						Number(firstOf(v["guard_id"] ?? v["id"] ?? key));
					const name =
						extractName(v) ??
						extractName(v["guard"]) ??
						extractName(key) ??
						null;

					locations.push({
						guardId: Number.isFinite(guardId) ? guardId : -1,
						lat,
						lon,
						isOnShift: toBoolean(
							v["is_on_shift"] ?? v["on_shift"] ?? v["onShift"],
						),
						lastUpdated: toStringSafe(
							v["last_updated"] ??
								v["updated_at"] ??
								v["updatedAt"] ??
								"",
						),
						propertyId:
							toNumber(v["property_id"] ?? v["property"] ?? null) ??
							null,
						propertyName:
							toStringSafe(
								v["property_name"] ?? v["property"] ?? null,
							) || null,
						name,
						phone: null,
					});
				}
			} else if (isObject(value)) {
				const v = value as RawLocationObject;

				const lat = toNumber(v["lat"] ?? v["latitude"] ?? v[0]);
				const lon = toNumber(v["lon"] ?? v["longitude"] ?? v[1]);
				if (lat === undefined || lon === undefined) continue;

				const guardIdCandidate = Number(
					firstOf(v["guard_id"] ?? v["id"] ?? key),
				);
				const guardId = Number.isFinite(guardIdCandidate)
					? guardIdCandidate
					: Number(key) || -1;
				const name =
					extractName(v) ?? extractName(v["guard"]) ?? null;

				locations.push({
					guardId,
					lat,
					lon,
					isOnShift: toBoolean(
						v["is_on_shift"] ?? v["on_shift"] ?? v["onShift"],
					),
					lastUpdated: toStringSafe(
						v["last_updated"] ??
							v["updated_at"] ??
							v["updatedAt"] ??
							"",
					),
					propertyId:
						toNumber(v["property_id"] ?? v["property"] ?? null) ??
						null,
					propertyName:
						toStringSafe(
							v["property_name"] ?? v["property"] ?? null,
						) || null,
					name,
					phone: null,
				});
			}
		}
	}

	// Rellenar phones/names con getGuard
	try {
		const ids = Array.from(
			new Set(
				locations
					.map((l) => l.guardId)
					.filter((id) => Number.isFinite(id) && id > 0),
			),
		);

		if (ids.length > 0) {
			const results = await Promise.all(
				ids.map(async (id) => {
					try {
						const g = await getGuard(id);
						return {
							id,
							name:
								`${g.firstName ?? ""} ${g.lastName ?? ""}`.trim() ||
								null,
							phone: g.phone ?? null,
						};
					} catch {
						return { id, name: null, phone: null };
					}
				}),
			);

			for (const res of results) {
				for (const loc of locations) {
					if (loc.guardId === res.id) {
						if (res.phone) loc.phone = res.phone;
						if ((!loc.name || !loc.name.trim()) && res.name)
							loc.name = res.name;
					}
				}
			}
		}
	} catch (err) {
		console.warn("Error fetching guard details:", err);
	}

	return { locations, totalGuards: total };
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

	if (payload.property_id !== undefined)
		body.property_id = payload.property_id;
	if (payload.property_name !== undefined)
		body.property_name = payload.property_name;

	const { data } = await api.post<UpdateLocationResponse>(
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
