// src/components/Shifts/types.ts

export type UserShort = {
  id?: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  isStaff?: boolean;
  isSuperuser?: boolean;
  dateJoined?: string; // ISO
  lastLogin?: string; // ISO
};

export type GuardDetails = {
  id?: number;
  user?: number;
  userDetails?: UserShort;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  birthDate?: string; // YYYY-MM-DD?
  phone?: string;
  ssn?: string;
  address?: string;
};

export type ClientBrief = {
  id?: number;
  user?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  balance?: string | number;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
};

export type PropertyDetails = {
  id?: number;
  owner?: number;
  ownerDetails?: ClientBrief;
  name?: string;
  alias?: string;
  address?: string;
  description?: string;
};

export type ServiceDetails = {
  id?: number;
  name?: string;
  description?: string;
  guard?: number | null;
  guardName?: string;
  assignedProperty?: number | null;
  propertyName?: string;
  rate?: string; // decimal as string
  monthlyBudget?: string; // decimal as string
  contractStartDate?: string; // ISO / date
  schedule?: string[] | null;
  recurrent?: boolean | null;
  totalHours?: string;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  isActive?: boolean;
};

/**
 * Shift (cliente) — campos básicos + campos opcionales que el Swagger expone
 *
 * Observaciones:
 * - Muchos campos son opcionales/nullables según swagger.
 * - Para facilitar el mapeo desde/ hacia la API, usamos camelCase aquí y
 *   la capa de servicio se encarga de mapear snake_case <-> camelCase.
 */
export type Shift = {
  id: number;
  guard: number;
  guardDetails?: GuardDetails;
  guardName?: string; // si el backend provee un nombre directo
  property: number;
  propertyDetails?: PropertyDetails;
  propertyName?: string; // si el backend provee un name directo
  service?: number | null;
  serviceDetails?: ServiceDetails;

  // planned vs actual times (opcionales según swagger)
  plannedStartTime?: string | null; // ISO
  plannedEndTime?: string | null; // ISO
  startTime?: string | null; // ISO
  endTime?: string | null; // ISO

  status?: "scheduled" | "completed" | "voided" | string;
  hoursWorked?: number | null;

  isActive?: boolean;
  isArmed?: boolean | null;
  // weapon (id) y detalles legibles (weapon_details)
  weapon?: number | null;
  weaponDetails?: string | null;
};
