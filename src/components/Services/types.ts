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
  totalHours: string | null;
  createdAt: string | null; // ISO datetime
  updatedAt: string | null; // ISO datetime
  isActive: boolean | null;
};
