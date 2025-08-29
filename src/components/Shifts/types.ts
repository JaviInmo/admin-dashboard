// src/components/Shifts/types.ts
export type Shift = {
  id: number;
  guard: number;
  property: number;
  startTime: string; // ISO string
  endTime: string; // ISO string
  status: "scheduled" | "completed" | "voided";
  hoursWorked: number;
  isActive?: boolean;
};
