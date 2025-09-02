"use client";

import { useMemo } from "react";
import { useShiftsFilters } from "@/contexts/shifts-context";
import { useQuery } from "@tanstack/react-query";
import { listShifts } from "@/lib/services/shifts";

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = startOfDay(d); const day = r.getDay(); const diff = (day + 6) % 7; r.setDate(r.getDate() - diff); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }

export default function KPISummaryInline() {
  const { rangeType, anchorDate, status } = useShiftsFilters();

  const { data } = useQuery({
    queryKey: ["kpis-shifts", rangeType, anchorDate.toDateString()],
    queryFn: async () => (await listShifts(1, undefined, 500)).items ?? [],
    staleTime: 30_000,
  });

  const [from, to] = useMemo(() => {
    if (rangeType === "day") {
      const s = startOfDay(anchorDate); return [s, addDays(s, 1)];
    }
    if (rangeType === "week") {
      const s = startOfWeek(anchorDate); return [s, addDays(s, 7)];
    }
    const s = startOfMonth(anchorDate); return [s, endOfMonth(anchorDate)];
  }, [anchorDate, rangeType]);

  const { count, activeNow, upcoming4h } = useMemo(() => {
    const now = Date.now();
    let total = 0, active = 0, upcoming = 0;
    for (const s of data ?? []) {
      if (!s.startTime || !s.endTime) continue;
      if (status.size && s.status && !status.has(s.status as any)) continue;
      const st = new Date(s.startTime).getTime();
      const et = new Date(s.endTime).getTime();
      if (et <= from.getTime() || st >= to.getTime()) continue;
      total++;
      if (st <= now && now < et) active++;
      else if (st > now && st - now <= 4 * 60 * 60 * 1000) upcoming++;
    }
    return { count: total, activeNow: active, upcoming4h: upcoming };
  }, [data, from, to, status]);

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1"><span className="font-medium text-foreground">Turnos</span><span>{count}</span></div>
      <div className="flex items-center gap-1"><span className="font-medium text-foreground">En servicio</span><span>{activeNow}</span></div>
      <div className="flex items-center gap-1"><span className="font-medium text-foreground">Próx. 4h</span><span>{upcoming4h}</span></div>
      <div className="flex items-center gap-1"><span className="font-medium text-foreground">Alertas</span><span>—</span></div>
    </div>
  );
}
