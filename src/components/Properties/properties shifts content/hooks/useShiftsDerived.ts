import * as React from "react";
import type { Shift } from "@/components/Shifts/types";
import { isoToLocalDateKey } from "../utils/date";

type SimpleGuard = {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/**
 * Intenta leer una propiedad string desde un objeto (soporta snake_case y camelCase).
 * Devuelve la primera propiedad que sea string.
 */
function getStringFrom(obj: unknown, ...keys: string[]): string | undefined {
  if (!isRecord(obj)) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
    // si viene como number y queremos string, podríamos convertir, pero aquí solo leemos strings
  }
  return undefined;
}

/**
 * Hook derivado: calcula la lista de guards, filtro, días y mapa guard->fecha->shifts.
 */
export function useShiftsDerived(
  shifts: Shift[],
  guardSearch: string,
  startDate: Date,
  viewMode: "week" | "month" | "year",
  serviceId: number | null = null
): {
  guardsAll: SimpleGuard[];
  guardsFiltered: SimpleGuard[];
  days: Date[];
  shiftsByGuardAndDate: Map<number, Record<string, Shift[]>>;
} {
  // guardsAll
  const guardsAll = React.useMemo(() => {
    // Filter shifts by service if serviceId is provided
    const filteredShifts = serviceId ? shifts.filter(s => {
      const shiftServiceId = Number(s.service ?? s.serviceDetails?.id ?? -1);
      return shiftServiceId === serviceId;
    }) : shifts;
    
    const map = new Map<number, SimpleGuard>();
    filteredShifts.forEach((s) => {
      const gid = Number(s.guard ?? s.guardDetails?.id ?? -1);
      if (gid === -1 || Number.isNaN(gid)) return;

      // Nombre preferido: guardName (directo del API) o propiedades del guardDetails
      let name = s.guardName ?? (s.guardDetails?.name ?? "");
      const gd = s.guardDetails;

      const firstName = getStringFrom(gd, "first_name", "firstName");
      const lastName = getStringFrom(gd, "last_name", "lastName");
      const email = getStringFrom(gd, "email");
      const phone = getStringFrom(gd, "phone");

      if (!name) {
        const composed = `${firstName ?? ""}${lastName ? ` ${lastName}` : ""}`.trim();
        name = composed || "";
      }

      if (!name) name = `#${gid}`;

      if (!map.has(gid)) {
        map.set(gid, {
          id: gid,
          name: name.trim() || `#${gid}`,
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
          email: email ?? undefined,
          phone: phone ?? undefined,
        });
      }
    });
    return Array.from(map.values());
  }, [shifts, serviceId]);

  const guardsFiltered = React.useMemo(() => {
    const q = (guardSearch ?? "").trim().toLowerCase();
    if (q === "") return guardsAll;
    return guardsAll.filter((g) => {
      return (
        (g.name ?? "").toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q) ||
        String(g.id).includes(q)
      );
    });
  }, [guardsAll, guardSearch]);

  const days = React.useMemo(() => {
    if (viewMode === "week") {
      // Find the Monday of the week containing startDate
      const d = new Date(startDate);
      const dayOfWeek = d.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, subtract 6 to get Monday
      d.setDate(d.getDate() - daysToSubtract);
      d.setHours(0, 0, 0, 0);
      return Array.from({ length: 7 }).map((_, i) => {
        const day = new Date(d);
        day.setDate(d.getDate() + i);
        return day;
      });
    }
    if (viewMode === "month") {
      const y = startDate.getFullYear();
      const m = startDate.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      return Array.from({ length: daysInMonth }).map((_, i) => {
        const d = new Date(y, m, i + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      });
    }
    // year
    const y = startDate.getFullYear();
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    const arr: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      arr.push(new Date(d));
    }
    return arr;
  }, [startDate, viewMode]);

  const shiftsByGuardAndDate = React.useMemo(() => {
    // Filter shifts by service if serviceId is provided
    const filteredShifts = serviceId ? shifts.filter(s => {
      const shiftServiceId = Number(s.service ?? s.serviceDetails?.id ?? -1);
      return shiftServiceId === serviceId;
    }) : shifts;
    
    const out = new Map<number, Record<string, Shift[]>>();

    filteredShifts.forEach((s) => {
      const gid = Number(s.guard ?? s.guardDetails?.id ?? -1);
      if (gid === -1 || Number.isNaN(gid)) return;

      // Intentamos leer plannedStartTime / planned_start_time / startTime / start_time
      const startIso =
        getStringFrom(s, "plannedStartTime", "planned_start_time") ??
        getStringFrom(s, "planned_start_time", "plannedStartTime") ??
        null;

      const dateKey =
        isoToLocalDateKey(startIso) ??
        isoToLocalDateKey(
          getStringFrom(s, "startTime", "start_time") ??
            getStringFrom(s, "start_time", "startTime") ??
            null
        );

      if (!dateKey) return;

      if (!out.has(gid)) out.set(gid, {});
      const rec = out.get(gid)!;
      rec[dateKey] = rec[dateKey] ?? [];
      rec[dateKey].push(s);
    });

    // ordenar cada lista por tiempo (plannedStartTime / startTime)
    out.forEach((rec) => {
      Object.keys(rec).forEach((k) => {
        rec[k].sort((a, b) => {
          const ta = new Date(
            getStringFrom(a, "plannedStartTime", "planned_start_time") ??
              a.plannedStartTime ??
              a.startTime ??
              0
          ).getTime();
          const tb = new Date(
            getStringFrom(b, "plannedStartTime", "planned_start_time") ??
              b.plannedStartTime ??
              b.startTime ??
              0
          ).getTime();
          return ta - tb;
        });
      });
    });

    return out;
  }, [shifts, serviceId]);

  return { guardsAll, guardsFiltered, days, shiftsByGuardAndDate };
}
