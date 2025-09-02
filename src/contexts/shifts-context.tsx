"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type ShiftsView = "property" | "guard";
export type RangeType = "day" | "week" | "month";

export type StatusFilter = "scheduled" | "completed" | "voided";

type ShiftsFilterState = {
  view: ShiftsView;
  setView: (v: ShiftsView) => void;
  rangeType: RangeType;
  setRangeType: (r: RangeType) => void;
  anchorDate: Date; // base day; for week view, we derive the week from here
  setAnchorDate: (d: Date) => void;
  selectedPropertyIds: number[];
  setSelectedPropertyIds: (ids: number[]) => void;
  addPropertyId: (id: number) => void;
  removePropertyId: (id: number) => void;
  selectedGuardIds: number[];
  setSelectedGuardIds: (ids: number[]) => void;
  addGuardId: (id: number) => void;
  removeGuardId: (id: number) => void;
  status: Set<StatusFilter>; // active status filters
  toggleStatus: (s: StatusFilter) => void;
  clearFilters: () => void;
};

const ShiftsContext = createContext<ShiftsFilterState | undefined>(undefined);

export function ShiftsProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ShiftsView>("property");
  const [rangeType, setRangeType] = useState<RangeType>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);
  const [selectedGuardIds, setSelectedGuardIds] = useState<number[]>([]);
  const [status, setStatus] = useState<Set<StatusFilter>>(new Set(["scheduled"]));

  const toggleStatus = (s: StatusFilter) => {
    setStatus((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });
  };

  const clearFilters = () => {
    setSelectedPropertyIds([]);
    setSelectedGuardIds([]);
    setStatus(new Set(["scheduled"]));
  };

  const addPropertyId = (id: number) =>
    setSelectedPropertyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const removePropertyId = (id: number) =>
    setSelectedPropertyIds((prev) => prev.filter((x) => x !== id));
  const addGuardId = (id: number) =>
    setSelectedGuardIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const removeGuardId = (id: number) =>
    setSelectedGuardIds((prev) => prev.filter((x) => x !== id));

  const value = useMemo<ShiftsFilterState>(
    () => ({
      view,
      setView,
      rangeType,
      setRangeType,
      anchorDate,
      setAnchorDate,
      selectedPropertyIds,
      setSelectedPropertyIds,
      addPropertyId,
      removePropertyId,
      selectedGuardIds,
      setSelectedGuardIds,
      addGuardId,
      removeGuardId,
      status,
      toggleStatus,
      clearFilters,
    }),
    [view, rangeType, anchorDate, selectedPropertyIds, selectedGuardIds, status],
  );

  return <ShiftsContext.Provider value={value}>{children}</ShiftsContext.Provider>;
}

export function useShiftsFilters(): ShiftsFilterState {
  const ctx = useContext(ShiftsContext);
  if (!ctx) throw new Error("useShiftsFilters must be used within ShiftsProvider");
  return ctx;
}
