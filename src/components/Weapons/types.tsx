// src/components/Weapons/types.tsx
export type GuardDetails = {
  id?: number;
  user?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  birth_date?: string | null;
  phone?: string | null;
  ssn?: string | null;
  address?: string | null;
  // añade más campos si tu backend devuelve otros
};

/**
 * Client-side Weapon type
 */
export type Weapon = {
  id: number;
  guard: number;
  guardDetails?: GuardDetails | null;
  serialNumber: string;
  model: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

/**
 * Payload para crear
 */
export type CreateWeaponPayload = {
  guard: number;
  serialNumber: string;
  model: string;
};

/**
 * Payload para actualizar (parcial)
 */
export type UpdateWeaponPayload = Partial<CreateWeaponPayload>;
