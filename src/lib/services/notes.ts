// src/lib/services/notes.ts
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";
import type {
  Note,
  CreateNotePayload,
  UpdateNotePayload,
  DuplicateNotePayload,
} from "@/components/Notes/type";

/**
 * Server shape — reflejar campos que devuelve el backend (DRF)
 * Aceptamos arrays o también formas legacy (número/objeto) por compatibilidad.
 */
type MaybeId = number | { id: number } | null;
type MaybeIdOrArray = MaybeId | MaybeId[];

type ServerNote = {
  id: number;
  name: string;
  description?: string | null;
  amount?: string | null; // DRF devuelve string (ej: "100.50")

  // ahora vienen arrays en el backend (ej: clients: [1], properties: [1], guards: [], services: [], ...)
  clients?: number[] | { id: number }[] | null;
  properties?: number[] | { id: number }[] | null;
  guards?: number[] | { id: number }[] | null;
  services?: number[] | { id: number }[] | null;
  shifts?: number[] | { id: number }[] | null;
  weapons?: number[] | { id: number }[] | null;
  type_of_services?: number[] | { id: number }[] | null;
  viewed_by_ids?: number[] | null;

  // legacy single-field names (por si el backend a veces devuelve así)
  client?: MaybeIdOrArray;
  property_obj?: MaybeIdOrArray;

  created_at?: string | null;
  updated_at?: string | null;
};

function extractIds(value: unknown): number[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "number") return v;
        if (typeof v === "object" && v !== null && "id" in v) {
          const maybe = (v as { id: unknown }).id;
          return typeof maybe === "number" ? maybe : null;
        }
        return null;
      })
      .filter((x): x is number => typeof x === "number");
  }
  // single value
  if (typeof value === "number") return [value];
  if (typeof value === "object" && value !== null && "id" in value) {
    const maybe = (value as { id: unknown }).id;
    return typeof maybe === "number" ? [maybe] : [];
  }
  return [];
}

function mapServerNote(n: ServerNote): Note {
  // parse arrays (o single values) a arrays de ids
  const clients = extractIds((n as any).clients ?? n.client);
  const properties = extractIds((n as any).properties ?? n.property_obj);
  const guards = extractIds(n.guards);
  const services = extractIds(n.services);
  const shifts = extractIds(n.shifts);
  const weapons = extractIds(n.weapons);
  const type_of_services = extractIds(n.type_of_services);
  const viewed_by_ids = extractIds(n.viewed_by_ids);

  // parsear amount a number (o null si no se puede)
  const amountRaw = n.amount ?? null;
  const amountParsed =
    typeof amountRaw === "string" && amountRaw.trim() !== ""
      ? Number(String(amountRaw).replace(",", "."))
      : null;
  const amount = Number.isFinite(amountParsed) ? amountParsed : null;

  // también rellenar campos legacy (por compatibilidad)
  const client = clients.length > 0 ? clients[0] : null;
  const property_obj = properties.length > 0 ? properties[0] : null;

  return {
    id: n.id,
    name: n.name,
    description: n.description ?? null,
    amount,
    amount_raw: amountRaw,
    clients,
    properties,
    guards,
    services,
    shifts,
    weapons,
    type_of_services,
    viewed_by_ids,
    client,
    property_obj,
    created_at: n.created_at ?? null,
    updated_at: n.updated_at ?? null,
  };
}

/**
 * listNotes
 */
export async function listNotes(
  page?: number,
  search?: string,
  pageSize?: number,
  ordering?: string,
): Promise<PaginatedResult<Note>> {
  return drfList<ServerNote, Note>(
    endpoints.notes,
    {
      page,
      page_size: pageSize ?? 10,
      search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
      ordering: ordering ?? undefined,
    },
    mapServerNote,
  );
}

export const NOTES_KEY = "notes" as const;

export async function getNote(id: number): Promise<Note> {
  const { data } = await api.get<ServerNote>(`${endpoints.notes}${id}/`);
  return mapServerNote(data);
}

export async function createNote(payload: CreateNotePayload): Promise<Note> {
  const body: Record<string, unknown> = {
    name: payload.name,
  };

  if (payload.description !== undefined && payload.description !== null) {
    body.description = payload.description;
  }
  if (payload.amount !== undefined && payload.amount !== null && payload.amount !== "") {
    body.amount = typeof payload.amount === "number" ? String(payload.amount) : payload.amount;
  }

  // enviar arrays si hay contenido (nuevos campos: clients, properties, guards, services, shifts, weapons, type_of_services)
  if (payload.clients !== undefined && payload.clients !== null) {
    body.clients = Array.isArray(payload.clients) ? payload.clients.filter((x) => x != null) : [];
  }
  if (payload.properties !== undefined && payload.properties !== null) {
    body.properties = Array.isArray(payload.properties) ? payload.properties.filter((x) => x != null) : [];
  }
  if (payload.guards !== undefined && payload.guards !== null) {
    body.guards = Array.isArray(payload.guards) ? payload.guards.filter((x) => x != null) : [];
  }
  if (payload.services !== undefined && payload.services !== null) {
    body.services = Array.isArray(payload.services) ? payload.services.filter((x) => x != null) : [];
  }
  if (payload.shifts !== undefined && payload.shifts !== null) {
    body.shifts = Array.isArray(payload.shifts) ? payload.shifts.filter((x) => x != null) : [];
  }
  if (payload.weapons !== undefined && payload.weapons !== null) {
    body.weapons = Array.isArray(payload.weapons) ? payload.weapons.filter((x) => x != null) : [];
  }
  if (payload.type_of_services !== undefined && payload.type_of_services !== null) {
    body.type_of_services = Array.isArray(payload.type_of_services)
      ? payload.type_of_services.filter((x) => x != null)
      : [];
  }

  // legacy single ids (if se proveen)
  if (payload.client !== undefined) body.client = payload.client;
  if (payload.property_obj !== undefined) body.property_obj = payload.property_obj;

  const { data } = await api.post<ServerNote>(endpoints.notes, body);
  return mapServerNote(data);
}

export async function updateNote(id: number, payload: UpdateNotePayload): Promise<Note> {
  const body: Record<string, unknown> = {};

  if (payload.name !== undefined && payload.name !== null) {
    body.name = payload.name;
  }
  if (payload.description !== undefined) {
    if (payload.description === "") {
      // omitimos cadena vacía
    } else {
      body.description = payload.description;
    }
  }
  if (payload.amount !== undefined) {
    if (payload.amount === "") {
      // omitimos cadena vacía
    } else if (payload.amount === null) {
      body.amount = null;
    } else {
      body.amount = typeof payload.amount === "number" ? String(payload.amount) : payload.amount;
    }
  }

  // arrays (reemplazar con los nuevos arrays si fueron provistos)
  if (payload.clients !== undefined) {
    body.clients = Array.isArray(payload.clients) ? payload.clients.filter((x) => x != null) : [];
  }
  if (payload.properties !== undefined) {
    body.properties = Array.isArray(payload.properties) ? payload.properties.filter((x) => x != null) : [];
  }
  if (payload.guards !== undefined) {
    body.guards = Array.isArray(payload.guards) ? payload.guards.filter((x) => x != null) : [];
  }
  if (payload.services !== undefined) {
    body.services = Array.isArray(payload.services) ? payload.services.filter((x) => x != null) : [];
  }
  if (payload.shifts !== undefined) {
    body.shifts = Array.isArray(payload.shifts) ? payload.shifts.filter((x) => x != null) : [];
  }
  if (payload.weapons !== undefined) {
    body.weapons = Array.isArray(payload.weapons) ? payload.weapons.filter((x) => x != null) : [];
  }
  if (payload.type_of_services !== undefined) {
    body.type_of_services = Array.isArray(payload.type_of_services)
      ? payload.type_of_services.filter((x) => x != null)
      : [];
  }

  // legacy single ids (si vienen)
  if (payload.client !== undefined) body.client = payload.client;
  if (payload.property_obj !== undefined) body.property_obj = payload.property_obj;

  const { data } = await api.patch<ServerNote>(`${endpoints.notes}${id}/`, body);
  return mapServerNote(data);
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`${endpoints.notes}${id}/`);
}

/**
 * Duplicate note: POST to /api/notes/:id/duplicate/
 */
export async function duplicateNote(id: number, payload?: DuplicateNotePayload): Promise<Note> {
  const body = payload && Object.keys(payload).length ? payload : {};
  const { data } = await api.post<ServerNote>(`${endpoints.notes}${id}/duplicate/`, body);
  return mapServerNote(data);
}

/**
 * Statistics and summary endpoints
 */
export async function notesStatistics(): Promise<unknown> {
  const { data } = await api.get(`${endpoints.notes}statistics/`);
  return data;
}

export async function notesSummary(): Promise<unknown> {
  const { data } = await api.get(`${endpoints.notes}summary/`);
  return data;
}
