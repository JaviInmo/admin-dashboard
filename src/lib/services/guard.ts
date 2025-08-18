// src/lib/services/guard.ts

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
    phone?: string | null;
    ssn?: string | null;
    address?: string | null;
    birth_date?: string | null;
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
    const { data } = await api.post<ServerGuard>(endpoints.guards, payload);
    return mapServerGuard(data);
}

export async function updateGuard(id: number, payload: UpdateGuardPayload): Promise<Guard> {
    const { data } = await api.patch<ServerGuard>(`${endpoints.guards}${id}/`, payload);
    return mapServerGuard(data);
}

export async function deleteGuard(id: number): Promise<void> {
    await api.delete(`${endpoints.guards}${id}/`);
}
