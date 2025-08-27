// src/components/Clients/types.ts
export interface Client {
    id: number;
    username: string;
    user?: number;      // <-- agregar aquí
    firstName?: string; 
    lastName?: string;
    email: string;
    phone?: string;
    address?: string;
    billingAddress?: string;
    balance?: number;
    created_at?: string;
    updated_at?: string;
    isActive?: boolean;
}
