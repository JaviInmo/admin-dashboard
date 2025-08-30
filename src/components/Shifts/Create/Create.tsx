// src/components/Shifts/Create.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createShift } from "@/lib/services/shifts";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";

import { listGuards, getGuard } from "@/lib/services/guard";
import { listProperties } from "@/lib/services/properties";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";

type CreateShiftProps = {
  open: boolean;
  onClose: () => void;
  guardId?: number;
  selectedDate?: Date;
  onCreated?: (shift: Shift) => void;
};

function toIsoFromDatetimeLocal(value: string) {
  const d = new Date(value);
  return d.toISOString();
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Extrae array de distintos shapes de respuesta paginada:
 * - T[]
 * - { results: T[] }
 * - { items: T[] }
 * - { data: { results: T[] } }
 */
function extractItems<T>(maybe: any): T[] {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe as T[];
  if (Array.isArray(maybe.results)) return maybe.results as T[];
  if (Array.isArray(maybe.items)) return maybe.items as T[];
  if (Array.isArray(maybe.data?.results)) return maybe.data.results as T[];
  return [];
}

export default function CreateShift({ open, onClose, guardId, onCreated }: CreateShiftProps) {
  const { TEXT } = useI18n();

  // placeholders usando las claves existentes en tus i18n
  const guardPlaceholder =
    (TEXT as any)?.guards?.table?.searchPlaceholder ?? "Buscar guard por nombre o email...";
  const propertyPlaceholder =
    (TEXT as any)?.properties?.table?.searchPlaceholder ?? "Buscar propiedades...";

  const [selectedGuard, setSelectedGuard] = React.useState<Guard | null>(null);
  const [guardQuery, setGuardQuery] = React.useState<string>("");
  const debouncedGuardQuery = useDebouncedValue(guardQuery, 300);
  const [guardResults, setGuardResults] = React.useState<Guard[]>([]);
  const [guardsLoading, setGuardsLoading] = React.useState(false);
  const [guardDropdownOpen, setGuardDropdownOpen] = React.useState(false);

  const [selectedProperty, setSelectedProperty] = React.useState<AppProperty | null>(null);
  const [propertyQuery, setPropertyQuery] = React.useState<string>("");
  const debouncedPropertyQuery = useDebouncedValue(propertyQuery, 300);
  const [propertyResults, setPropertyResults] = React.useState<AppProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = React.useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = React.useState(false);

  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");
  const [status, setStatus] = React.useState<Shift["status"]>("scheduled");
  const [loading, setLoading] = React.useState(false);

  // reset cuando se cierra el dialog
  React.useEffect(() => {
    if (!open) {
      setSelectedGuard(null);
      setGuardQuery("");
      setGuardResults([]);
      setGuardsLoading(false);
      setGuardDropdownOpen(false);

      setSelectedProperty(null);
      setPropertyQuery("");
      setPropertyResults([]);
      setPropertiesLoading(false);
      setPropertyDropdownOpen(false);

      setStart("");
      setEnd("");
      setStatus("scheduled");
    }
  }, [open]);

  // prefill si recibes guardId (mantiene el id internamente pero no muestra "#id")
  React.useEffect(() => {
    if (!open) return;
    if (!guardId) return;
    let mounted = true;
    (async () => {
      try {
        const g = await getGuard(guardId);
        if (!mounted) return;
        setSelectedGuard(g);
        // ahora sin "#id"
        setGuardQuery(`${g.firstName} ${g.lastName} (${g.email ?? ""})`);
      } catch (err) {
        console.error("prefill guard failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [guardId, open]);

  // buscar guards con debounce
  React.useEffect(() => {
    let mounted = true;
    const q = (debouncedGuardQuery ?? "").trim();
    if (q === "") {
      setGuardResults([]);
      return;
    }
    setGuardsLoading(true);
    (async () => {
      try {
        const res = await listGuards(1, q, 10);
        if (!mounted) return;
        const items = extractItems<Guard>(res);
        setGuardResults(items);
        setGuardDropdownOpen(true);
      } catch (err) {
        console.error("listGuards error", err);
        setGuardResults([]);
      } finally {
        if (mounted) setGuardsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debouncedGuardQuery]);

  // buscar properties con debounce
  React.useEffect(() => {
    let mounted = true;
    const q = (debouncedPropertyQuery ?? "").trim();
    if (q === "") {
      setPropertyResults([]);
      return;
    }
    setPropertiesLoading(true);
    (async () => {
      try {
        const res = await listProperties(1, q, 10);
        if (!mounted) return;
        const items = extractItems<AppProperty>(res);
        setPropertyResults(items);
        setPropertyDropdownOpen(true);
      } catch (err) {
        console.error("listProperties error", err);
        setPropertyResults([]);
      } finally {
        if (mounted) setPropertiesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debouncedPropertyQuery]);

  // etiqueta para mostrar (sin id)
  const guardLabel = (g?: Guard | null) => {
    if (!g) return "";
    return `${g.firstName} ${g.lastName} (${g.email ?? ""})`;
  };
  const propertyLabel = (p?: AppProperty | null) => {
    if (!p) return "";
    return `${p.name ?? p.alias ?? p.address} #${p.id}`;
  };

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!start || !end) {
      toast.error((TEXT as any)?.shifts?.errors?.missingDates ?? "Start and end are required");
      return;
    }
    const startIso = toIsoFromDatetimeLocal(start);
    const endIso = toIsoFromDatetimeLocal(end);

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error((TEXT as any)?.shifts?.errors?.endBeforeStart ?? "End must be after start");
      return;
    }

    if (!selectedProperty) {
      toast.error((TEXT as any)?.shifts?.errors?.missingProperty ?? "Property required");
      return;
    }

    if (!selectedGuard) {
      toast.error((TEXT as any)?.shifts?.errors?.missingGuard ?? "Guard required");
      return;
    }

    setLoading(true);
    try {
      const created = await createShift({
        guard: selectedGuard.id, // id sigue usándose internamente
        property: Number(selectedProperty.id),
        start_time: startIso,
        end_time: endIso,
        status,
      });
      toast.success((TEXT as any)?.shifts?.messages?.created ?? "Shift created");
      onCreated?.(created as Shift);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error((TEXT as any)?.shifts?.errors?.createFailed ?? "Could not create shift");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle>{(TEXT as any)?.shifts?.create?.title ?? "Crear Turno"}</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          {/* Guard select-search */}
          <div className="relative">
            <label className="text-sm text-muted-foreground block mb-1">Guard</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2"
              value={selectedGuard ? guardLabel(selectedGuard) : guardQuery}
              onChange={(e) => {
                if (selectedGuard) setSelectedGuard(null);
                setGuardQuery(e.target.value);
              }}
              onFocus={() => {
                if (guardResults.length > 0) setGuardDropdownOpen(true);
              }}
              placeholder={guardPlaceholder}
              aria-label="Buscar guard"
            />
            {selectedGuard && (
              <button
                type="button"
                className="absolute right-2 top-2 text-xs text-muted-foreground"
                onClick={() => {
                  setSelectedGuard(null);
                  setGuardQuery("");
                }}
              >
                Clear
              </button>
            )}

            {guardDropdownOpen && (guardResults.length > 0 || guardsLoading) && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-56 overflow-auto">
                {guardsLoading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
                {!guardsLoading && guardResults.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matches.</div>}
                {!guardsLoading &&
                  guardResults.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/10"
                      onClick={() => {
                        setSelectedGuard(g);
                        // guardQuery sin "#id"
                        setGuardQuery(`${g.firstName} ${g.lastName} (${g.email ?? ""})`);
                        setGuardDropdownOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <div className="text-sm truncate">{`${g.firstName} ${g.lastName}`}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{g.email}</div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Property select-search */}
          <div className="relative">
            <label className="text-sm text-muted-foreground block mb-1">Property</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2"
              value={selectedProperty ? propertyLabel(selectedProperty) : propertyQuery}
              onChange={(e) => {
                if (selectedProperty) setSelectedProperty(null);
                setPropertyQuery(e.target.value);
              }}
              onFocus={() => {
                if (propertyResults.length > 0) setPropertyDropdownOpen(true);
              }}
              placeholder={propertyPlaceholder}
              aria-label="Buscar propiedad"
            />
            {selectedProperty && (
              <button
                type="button"
                className="absolute right-2 top-2 text-xs text-muted-foreground"
                onClick={() => {
                  setSelectedProperty(null);
                  setPropertyQuery("");
                }}
              >
                Clear
              </button>
            )}

            {propertyDropdownOpen && (propertyResults.length > 0 || propertiesLoading) && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-56 overflow-auto">
                {propertiesLoading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
                {!propertiesLoading && propertyResults.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matches.</div>}
                {!propertiesLoading &&
                  propertyResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/10"
                      onClick={() => {
                        setSelectedProperty(p);
                        setPropertyQuery(propertyLabel(p));
                        setPropertyDropdownOpen(false);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-sm truncate">{p.name ?? p.alias ?? p.address}</div>
                        <div className="text-xs text-muted-foreground">#{p.id}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{p.address}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Start</label>
              <input
                type="datetime-local"
                className="w-full rounded border px-3 py-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">End</label>
              <input
                type="datetime-local"
                className="w-full rounded border px-3 py-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Shift["status"])}
              className="w-full rounded border px-3 py-2"
            >
              <option value="scheduled">scheduled</option>
              <option value="completed">completed</option>
              <option value="voided">voided</option>
            </select>
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" onClick={onClose} type="button">
                {(TEXT as any)?.actions?.close ?? "Close"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (TEXT as any)?.actions?.saving ?? "Saving..." : (TEXT as any)?.actions?.create ?? "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
