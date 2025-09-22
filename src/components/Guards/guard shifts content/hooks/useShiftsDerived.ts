// src/components/Guards/guard shifts content/hooks/useShiftsDerived.ts
import * as React from "react";
import type { Shift } from "@/components/Shifts/types";
import { isoToLocalDateKey } from "@/components/Properties/properties shifts content/utils/date"; // ajusta ruta si tu util está en otro sitio

type SimpleProperty = {
  id: number;
  name: string;
  alias?: string;
  address?: string;
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
  }
  return undefined;
}

/**
 * Hook derivado: calcula la lista de properties, filtro, días y mapa property->fecha->shifts.
 */
export function useShiftsDerived(
  shifts: Shift[],
  propertySearch: string,
  startDate: Date,
  viewMode: "week" | "month" | "year"
): {
  propertiesAll: SimpleProperty[];
  propertiesFiltered: SimpleProperty[];
  days: Date[];
  shiftsByPropertyAndDate: Map<number, Record<string, Shift[]>>;
} {
  // propertiesAll
  const propertiesAll = React.useMemo(() => {
    const map = new Map<number, SimpleProperty>();
    shifts.forEach((s) => {
      const pid = Number(s.property ?? s.propertyDetails?.id ?? -1);
      if (pid === -1 || Number.isNaN(pid)) return;

      // Nombre preferido: propertyName (directo del API) o propiedades del propertyDetails
      let name = s.propertyName ?? (s.propertyDetails?.name ?? "");
      const pd = s.propertyDetails;

      const alias = getStringFrom(pd, "alias");
      const address = getStringFrom(pd, "address");

      if (!name) {
        name = alias ?? "";
      }

      if (!name) name = `#${pid}`;

      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: name.trim() || `#${pid}`,
          alias: alias ?? undefined,
          address: address ?? undefined,
        });
      }
    });
    return Array.from(map.values());
  }, [shifts]);

  const propertiesFiltered = React.useMemo(() => {
    const q = (propertySearch ?? "").trim().toLowerCase();
    if (q === "") return propertiesAll;
    return propertiesAll.filter((p) => {
      return (
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.alias ?? "").toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q) ||
        String(p.id).includes(q)
      );
    });
  }, [propertiesAll, propertySearch]);

  const days = React.useMemo(() => {
    if (viewMode === "week") {
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        d.setHours(0, 0, 0, 0);
        return d;
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

  const shiftsByPropertyAndDate = React.useMemo(() => {
    const out = new Map<number, Record<string, Shift[]>>();

    shifts.forEach((s) => {
      const pid = Number(s.property ?? s.propertyDetails?.id ?? -1);
      if (pid === -1 || Number.isNaN(pid)) return;

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

      if (!out.has(pid)) out.set(pid, {});
      const rec = out.get(pid)!;
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
  }, [shifts]);

  return { propertiesAll, propertiesFiltered, days, shiftsByPropertyAndDate };
}
