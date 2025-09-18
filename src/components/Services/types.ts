// src/components/Services/types.ts
export type Service = {
  id: number;
  name: string;
  description: string | null;
  guard: number | null;
  guardName: string | null;
  assignedProperty: number | null;
  propertyName: string | null;
  rate: string | null; // decimal string
  monthlyBudget: string | null; // decimal string
  contractStartDate: string | null; // date (ISO) when contract starts
  startDate: string | null; // fecha inicio período vigencia
  endDate: string | null; // fecha fin período vigencia
  startTime: string | null; // "HH:MM:SS" or similar
  endTime: string | null; // "HH:MM:SS" or similar
  schedule: string[] | null; // array of date strings (ISO) when scheduled
  recurrent: boolean | null; // whether it's recurring
  totalHours: string | null;
  createdAt: string | null; // ISO datetime
  updatedAt: string | null; // ISO datetime
  isActive: boolean | null;
};
