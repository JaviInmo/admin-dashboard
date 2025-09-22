// src/components/Guards/guard shifts content/hooks/useShifts.ts
import * as React from "react";
import { listShiftsByGuard } from "@/lib/services/shifts"; // asumo que existe una función similar a listShiftsByProperty
import type { Shift } from "@/components/Shifts/types";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isShiftCandidate(x: unknown): x is Shift {
  if (!isObject(x)) return false;
  // mínimos: id existe y property existe (aceptamos property como number o string en caso de backend raro)
  const id = x["id"];
  const property = x["property"];
  return typeof id === "number" && (typeof property === "number" || typeof property === "string");
}

function extractShiftsFromResponse(res: unknown): Shift[] {
  if (!res) return [];

  // caso: array directo
  if (Array.isArray(res) && res.every(isShiftCandidate)) {
    return res as Shift[];
  }

  if (isObject(res)) {
    // { items: [...] } o { results: [...] }
    const maybeItems = res["items"];
    const maybeResults = res["results"];
    if (Array.isArray(maybeItems) && maybeItems.every(isShiftCandidate)) {
      return maybeItems as Shift[];
    }
    if (Array.isArray(maybeResults) && maybeResults.every(isShiftCandidate)) {
      return maybeResults as Shift[];
    }

    // { data: { results: [...] } }
    const data = res["data"];
    if (isObject(data)) {
      const dataResults = data["results"];
      if (Array.isArray(dataResults) && dataResults.every(isShiftCandidate)) {
        return dataResults as Shift[];
      }
    }
  }

  // fallback vacío
  return [];
}

/**
 * Tipo reducido solo para las claves que usa este hook.
 */
type UiTextFragmentForShifts = {
  shifts?: {
    errors?: {
      fetchFailed?: string;
    };
  };
};

/**
 * Hook que lista turnos por guardia.
 * Nota: usa listShiftsByGuard(guardId, page, pageSize, ordering)
 */
export function useShifts(guardId: number) {
  // 'useI18n' puede devolver un objeto grande; aquí lo afirmamos a un shape reducido
  const { TEXT } = useI18n() as { TEXT?: UiTextFragmentForShifts };

  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchShifts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listShiftsByGuard(
        guardId,
        1,
        1000,
        "planned_start_time"
      );

      const items = extractShiftsFromResponse(res);
      setShifts(items);
    } catch (err) {
      console.error("Error fetching shifts by guard:", err);
      const msg = TEXT?.shifts?.errors?.fetchFailed ?? "No se pudieron cargar los turnos";
      setError(String(msg));
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  }, [guardId, TEXT]);

  return {
    shifts,
    setShifts,
    loading,
    error,
    fetchShifts,
  };
}
