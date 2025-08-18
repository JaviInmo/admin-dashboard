import type { Guard } from "@/components/Guards/types";
import { endpoints } from "@/lib/endpoints";
import { api } from "@/lib/http";
import { drfList, type PaginatedResult } from "@/lib/pagination";

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

export async function listGuards(
    page?: number,
    search?: string,
    pageSize: number = 10,
): Promise<PaginatedResult<Guard>> {
    return drfList<ServerGuard, Guard>(
        endpoints.guards,
        {
            page,
            page_size: pageSize,
            search: search && String(search).trim() !== "" ? String(search).trim() : undefined,
        },
        mapServerGuard
    );
}

export const GUARDS_KEY = "guards" as const;

export async function getGuard(id: number): Promise<Guard> {
    const { data } = await api.get<ServerGuard>(`${endpoints.guards}${id}/`);
    return mapServerGuard(data);
}

export async function createGuard(payload: CreateGuardPayload): Promise<Guard> {
    // Construir body explícito y sanitizado
    const body: Record<string, unknown> = {
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
    };

    if (payload.phone !== undefined && payload.phone !== null && payload.phone !== "") {
        body.phone = payload.phone;
    }
    if (payload.ssn !== undefined && payload.ssn !== null && payload.ssn !== "") {
        body.ssn = payload.ssn;
    }
    if (payload.address !== undefined && payload.address !== null && payload.address !== "") {
        body.address = payload.address;
    }
    if (payload.birth_date !== undefined && payload.birth_date !== null && payload.birth_date !== "") {
        body.birth_date = payload.birth_date;
    }

    // Defender: nunca enviar user
    if ("user" in body) {
        delete (body as any).user;
    }

    const { data } = await api.post<ServerGuard>(endpoints.guards, body);
    return mapServerGuard(data);
}

export async function updateGuard(id: number, payload: UpdateGuardPayload): Promise<Guard> {
    // Construir body sólo con campos presentes en payload (PATCH semantics)
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
        // permitir null explicito (si el caller quiere borrar), pero evitar ""
        if (payload.phone === "") {
            // si quieres que "" se interprete como borrar, cambia a null; por ahora lo omitimos
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

    const { data } = await api.patch<ServerGuard>(`${endpoints.guards}${id}/`, body);
    return mapServerGuard(data);
}

export async function deleteGuard(id: number): Promise<void> {
    await api.delete(`${endpoints.guards}${id}/`);
}
