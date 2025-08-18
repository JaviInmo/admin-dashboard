// src/components/Guards/types.ts

export interface Guard {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  ssn?: string | null;
  address?: string | null;
  birthdate?: string | null; // ISO date string, p.ej. "1980-01-01"
}
