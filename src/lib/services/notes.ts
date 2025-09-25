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
 */
type ServerNote = {
  id: number;
  name: string;
  description?: string | null;
  amount?: string | null; // DRF devuelve string (ej: "100.50")
  client?: number | { id: number } | null;
  property_obj?: number | { id: number } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function mapServerNote(n: ServerNote): Note {
  // resolver client/property que pueden venir como id (number) o como objeto { id: number }
  let clientId: number | null = null;
  if (typeof n.client === "number") {
    clientId = n.client;
  } else if (typeof n.client === "object" && n.client !== null && "id" in n.client) {
    const maybeId = (n.client as { id: unknown }).id;
    if (typeof maybeId === "number") clientId = maybeId;
  }

  let propertyId: number | null = null;
  if (typeof n.property_obj === "number") {
    propertyId = n.property_obj;
  } else if (typeof n.property_obj === "object" && n.property_obj !== null && "id" in n.property_obj) {
    const maybeId = (n.property_obj as { id: unknown }).id;
    if (typeof maybeId === "number") propertyId = maybeId;
  }

  // parsear amount a number (o null si no se puede)
  const amountRaw = n.amount ?? null;
  const amountParsed =
    typeof amountRaw === "string" && amountRaw.trim() !== ""
      ? Number(String(amountRaw).replace(",", "."))
      : null;
  const amount = Number.isFinite(amountParsed) ? amountParsed : null;

  return {
    id: n.id,
    name: n.name,
    description: n.description ?? null,
    amount,
    amount_raw: amountRaw,
    client: clientId,
    property_obj: propertyId,
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
  if (payload.client !== undefined) {
    body.client = payload.client;
  }
  if (payload.property_obj !== undefined) {
    body.property_obj = payload.property_obj;
  }

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
  if (payload.client !== undefined) {
    body.client = payload.client;
  }
  if (payload.property_obj !== undefined) {
    body.property_obj = payload.property_obj;
  }

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
