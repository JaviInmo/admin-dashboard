// src/lib/services/weapons.ts
import type { Weapon, CreateWeaponPayload, UpdateWeaponPayload } from "@/components/Weapons/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

/**
 * Server shape (según tu swagger)
 */
type ServerWeapon = {
  id: number;
  guard: number;
  guard_details?: any | null;
  serial_number: string;
  model: string;
  created_at?: string | null;
  updated_at?: string | null;
};

/**
 * Mapeo server -> client
 */
function mapServerWeapon(s: ServerWeapon): Weapon {
  return {
    id: s.id,
    guard: s.guard,
    guardDetails: s.guard_details ?? null,
    serialNumber: s.serial_number,
    model: s.model,
    createdAt: s.created_at ?? null,
    updatedAt: s.updated_at ?? null,
  };
}

/**
 * listWeapons
 */
export async function listWeapons(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Weapon>> {
  return drfList<ServerWeapon, Weapon>(
    endpoints.weapons,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerWeapon,
  );
}

export const WEAPONS_KEY = "weapons" as const;

/**
 * getWeapon
 */
export async function getWeapon(id: number): Promise<Weapon> {
  const { data } = await api.get<ServerWeapon>(`${endpoints.weapons}${id}/`);
  return mapServerWeapon(data);
}

/**
 * createWeapon
 */
export async function createWeapon(payload: CreateWeaponPayload): Promise<Weapon> {
  const body: Record<string, unknown> = {
    guard: payload.guard,
    serial_number: payload.serialNumber,
    model: payload.model,
  };

  const { data } = await api.post<ServerWeapon>(endpoints.weapons, body);
  return mapServerWeapon(data);
}

/**
 * updateWeapon (PATCH semantics)
 */
export async function updateWeapon(id: number, payload: UpdateWeaponPayload): Promise<Weapon> {
  const body: Record<string, unknown> = {};

  if (payload.guard !== undefined && payload.guard !== null) body.guard = payload.guard;
  if (payload.serialNumber !== undefined) {
    if (payload.serialNumber === "") {
      // omitimos cadena vacía
    } else {
      body.serial_number = payload.serialNumber;
    }
  }
  if (payload.model !== undefined) {
    if (payload.model === "") {
      // omitimos cadena vacía
    } else {
      body.model = payload.model;
    }
  }

  const { data } = await api.patch<ServerWeapon>(`${endpoints.weapons}${id}/`, body);
  return mapServerWeapon(data);
}

/**
 * deleteWeapon (soft delete according to swagger - DELETE /weapons/{id}/)
 */
export async function deleteWeapon(id: number): Promise<void> {
  await api.delete(`${endpoints.weapons}${id}/`);
}

/**
 * restoreWeapon - POST /weapons/{id}/restore/
 * En swagger la ruta devuelve 201 con el objeto. Algunos backends esperan body vacío.
 */
export async function restoreWeapon(id: number): Promise<Weapon> {
  const { data } = await api.post<ServerWeapon>(`${endpoints.weapons}${id}/restore/`, {});
  return mapServerWeapon(data);
}

/**
 * softDeleteWeapon - POST /weapons/{id}/soft_delete/
 * Devuelve 201 con el objeto según swagger.
 */
export async function softDeleteWeapon(id: number): Promise<Weapon> {
  const { data } = await api.post<ServerWeapon>(`${endpoints.weapons}${id}/soft_delete/`, {});
  return mapServerWeapon(data);
}

/**
 * bulkDeleteWeapons - POST /weapons/bulk_delete/
 * Ajusta la forma del body si tu backend espera una lista de objetos en lugar de { ids: [...] }.
 */
export async function bulkDeleteWeapons(ids: number[]): Promise<void> {
  // Si tu backend espera { ids: [1,2,3] } -> OK
  // Si espera una lista de objetos, cambia a api.post(endpoints.weapons + 'bulk_delete/', idsAsObjects)
  await api.post(`${endpoints.weapons}bulk_delete/`, { ids });
}

/**
 * bulkUpdateWeapons - POST /weapons/bulk_update/
 * Recibe un array de objetos con fields a actualizar. Ajusta si tu backend requiere otra forma.
 * Ejemplo de item: { id: 1, serial_number: 'xxx', model: 'yyy', guard: 5 }
 */
export async function bulkUpdateWeapons(items: Array<Record<string, unknown>>): Promise<Weapon[]> {
  const { data } = await api.post<ServerWeapon[]>(`${endpoints.weapons}bulk_update/`, items);
  return data.map(mapServerWeapon);
}

/**
 * listWeaponsByGuard (cliente-filtrado)
 *
 * Nota: según tu swagger GET /weapons/ **no** soporta parámetro guard,
 * por eso aquí traemos páginas del servidor y filtramos por guard en el cliente.
 * Esto es temporal hasta que el backend implemente filtrado por guard o un endpoint /guards/{id}/weapons/.
 */
export async function listWeaponsByGuard(
  guardId: number,
  page?: number,
  pageSize?: number,
  ordering?: string,
  search?: string,
): Promise<PaginatedResult<Weapon>> {
  // Si guardId no es válido, devolvemos vacío (con next/previous para concordar con PaginatedResult)
  if (!guardId) {
    return { count: 0, items: [], next: null, previous: null };
  }

  // Vamos a paginar en el cliente: primero traemos todas las páginas del backend
  // (pasando search/ordering al servidor si aplica) y luego filtramos por guard.
  const fetchPageSize = 100; // ajustar si esperas muchos items; balance entre requests y memoria
  let currentPage = 1;
  let allItems: Weapon[] = [];
  let totalCount = 0;

  while (true) {
    const res = await drfList<ServerWeapon, Weapon>(
      endpoints.weapons,
      {
        page: currentPage,
        page_size: fetchPageSize,
        ordering: ordering ?? undefined,
        search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      },
      mapServerWeapon,
    );

    allItems = allItems.concat(res.items);
    totalCount = res.count ?? totalCount;

    // si obtuvimos menos items que fetchPageSize => última página
    if ((res.items.length ?? 0) < fetchPageSize) break;

    // protección: si ya obtuvimos todo según count
    if (allItems.length >= (res.count ?? allItems.length)) break;

    currentPage++;
  }

  // filtrar por guardId en cliente
  const filtered = allItems.filter((w) => Number(w.guard) === Number(guardId));

  // paginar la lista filtrada según page/pageSize solicitados
  const p = Math.max(1, page ?? 1);
  const ps = Math.max(1, pageSize ?? 10);
  const start = (p - 1) * ps;
  const pagedItems = filtered.slice(start, start + ps);

  // construir next/previous sencillos (relativos) para mantener la forma PaginatedResult
  const next = start + ps < filtered.length ? `?page=${p + 1}&page_size=${ps}` : null;
  const previous = p > 1 ? `?page=${p - 1}&page_size=${ps}` : null;

  return {
    count: filtered.length,
    items: pagedItems,
    next,
    previous,
  };
}
