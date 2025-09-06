// src/components/Shifts/types.ts

export type UserShort = {
  id: number;
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
  rate?: string; // decimal as string (Swagger showed string($decimal))
  monthlyBudget?: string; // decimal as string
  contractStartDate?: string; // ISO / date
  totalHours?: string;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  isActive?: boolean;
};

/**
 * Shift (cliente) — campos básicos + campos opcionales que el Swagger expone
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

  startTime: string; // ISO string
  endTime: string; // ISO string

  status: "scheduled" | "completed" | "voided";
  hoursWorked: number;

  isActive?: boolean;
  isArmed?: boolean;
  weaponDetails?: string;
};
