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
import { createShift, listShiftsByGuard } from "@/lib/services/shifts";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";

import { listGuards, getGuard } from "@/lib/services/guard";
import { listProperties } from "@/lib/services/properties";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";
import { cn } from "@/lib/utils";

type CreateShiftProps = {
  open: boolean;
  onClose: () => void;
  guardId?: number;
  selectedDate?: Date;
  propertyId?: number | null;
  preloadedProperties?: AppProperty[]; // Cache de propiedades
  preloadedGuard?: Guard | null; // Cache del guardia actual
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

export default function CreateShift({ 
  open, 
  onClose, 
  guardId, 
  selectedDate, 
  propertyId, 
  preloadedProperties = [], 
  preloadedGuard = null,
  onCreated 
}: CreateShiftProps) {
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

  // Estados para detección de solapamientos
  const [hasOverlap, setHasOverlap] = React.useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = React.useState<string>("");
  const [existingShifts, setExistingShifts] = React.useState<Shift[]>([]);

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
      
      // Limpiar estados de solapamiento
      setHasOverlap(false);
      setOverlapMessage("");
      setExistingShifts([]);
    }
  }, [open]);

  // prefill si recibes guardId (usa cache si está disponible)
  React.useEffect(() => {
    if (!open) return;
    if (!guardId) return;
    
    // Si tenemos el guardia preloaded, usarlo directamente
    if (preloadedGuard && preloadedGuard.id === guardId) {
      console.log("✅ Usando guardia desde cache");
      setSelectedGuard(preloadedGuard);
      setGuardQuery(""); // Limpiar query para que use guardLabel
      return;
    }
    
    // Si no hay cache, hacer llamada a la API (fallback)
    let mounted = true;
    (async () => {
      try {
        console.log("⚠️ Cargando guardia desde API (sin cache)");
        const g = await getGuard(guardId);
        if (!mounted) return;
        setSelectedGuard(g);
        setGuardQuery(""); // Limpiar query para que use guardLabel
      } catch (err) {
        console.error("prefill guard failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [guardId, open, preloadedGuard]);

  // prefill fecha (usa selectedDate o fecha de hoy como fallback)
  React.useEffect(() => {
    if (!open) return;
    
    // Usar selectedDate si está disponible, sino usar fecha de hoy
    const targetDate = selectedDate || new Date();
    
    // Crear fecha con hora de inicio por defecto (8:00 AM)
    const startDate = new Date(targetDate);
    startDate.setHours(8, 0, 0, 0);
    
    // Crear fecha con hora de fin por defecto (8:00 AM + 8 horas = 4:00 PM)
    const endDate = new Date(targetDate);
    endDate.setHours(16, 0, 0, 0);
    
    // Convertir a formato datetime-local (YYYY-MM-DDTHH:mm)
    const startString = startDate.toISOString().slice(0, 16);
    const endString = endDate.toISOString().slice(0, 16);
    
    setStart(startString);
    setEnd(endString);
  }, [open, selectedDate]);

  // prefill propiedad si recibes propertyId
  React.useEffect(() => {
    if (!open) return;
    if (!propertyId) return;
    
    // Primero intentar desde el cache
    if (preloadedProperties.length > 0) {
      const property = preloadedProperties.find(p => Number(p.id) === propertyId);
      if (property) {
        console.log("✅ Propiedad encontrada en cache:", property.name);
        setSelectedProperty(property);
        setPropertyQuery(`${property.name ?? property.alias ?? property.address} #${property.id}`);
        return;
      }
    }
    
    // Si no está en cache, hacer llamada a la API
    console.log("🔄 Propiedad no encontrada en cache, consultando API...");
    let mounted = true;
    (async () => {
      try {
        const properties = await listProperties(1, "", 1000);
        if (!mounted) return;
        
        const items = extractItems<AppProperty>(properties);
        const property = items.find(p => Number(p.id) === propertyId);
        
        if (property) {
          console.log("✅ Propiedad encontrada en API:", property.name);
          setSelectedProperty(property);
          setPropertyQuery(`${property.name ?? property.alias ?? property.address} #${property.id}`);
        }
      } catch (err) {
        console.error("❌ Error al consultar propiedad:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [propertyId, open, preloadedProperties]);

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

  // buscar properties con debounce (optimizado con cache)
  React.useEffect(() => {
    let mounted = true;
    const q = (debouncedPropertyQuery ?? "").trim();
    if (q === "") {
      setPropertyResults([]);
      return;
    }
    
    setPropertiesLoading(true);
    
    // Intentar buscar en cache primero si está disponible
    if (preloadedProperties.length > 0) {
      console.log("🔍 Buscando en cache de propiedades...");
      const filtered = preloadedProperties.filter(prop => 
        prop.name?.toLowerCase().includes(q.toLowerCase()) ||
        prop.alias?.toLowerCase().includes(q.toLowerCase()) ||
        prop.address?.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 10); // Limitar a 10 resultados
      
      if (mounted) {
        setPropertyResults(filtered);
        setPropertyDropdownOpen(true);
        setPropertiesLoading(false);
        console.log(`✅ Encontrados ${filtered.length} resultados en cache`);
        
        // Si hay pocos resultados en cache, complementar con búsqueda API
        if (filtered.length < 3 && q.length >= 2) {
          console.log("🔄 Pocos resultados en cache, complementando con API...");
          (async () => {
            try {
              const res = await listProperties(1, q, 10);
              if (!mounted) return;
              const apiItems = extractItems<AppProperty>(res);
              
              // Combinar resultados, evitando duplicados
              const cacheIds = new Set(filtered.map(p => p.id));
              const newItems = apiItems.filter(p => !cacheIds.has(p.id));
              const combinedResults = [...filtered, ...newItems];
              
              setPropertyResults(combinedResults);
              console.log(`✅ Combinados: ${filtered.length} cache + ${newItems.length} API = ${combinedResults.length} total`);
            } catch (err) {
              console.error("Error en búsqueda complementaria:", err);
              setPropertyResults(filtered); // Usar solo resultados del cache
            }
          })();
        }
      }
      return;
    }
    
    // Si no hay cache, hacer llamada a la API
    console.log("🔄 Cache no disponible, consultando API...");
    (async () => {
      try {
        const res = await listProperties(1, q, 10);
        if (!mounted) return;
        const items = extractItems<AppProperty>(res);
        setPropertyResults(items);
        setPropertyDropdownOpen(true);
        console.log(`✅ Encontrados ${items.length} resultados en API`);
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
  }, [debouncedPropertyQuery, preloadedProperties]);

  // etiqueta para mostrar (sin email, solo nombre)
  const guardLabel = (g?: Guard | null) => {
    if (!g) return "";
    return `${g.firstName} ${g.lastName}`;
  };
  const propertyLabel = (p?: AppProperty | null) => {
    if (!p) return "";
    return `${p.name ?? p.alias ?? p.address} #${p.id}`;
  };

  // Función para verificar solapamientos entre dos turnos
  const checkTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const startDate1 = new Date(start1);
    const endDate1 = new Date(end1);
    const startDate2 = new Date(start2);
    const endDate2 = new Date(end2);

    // Verificar si hay solapamiento
    return startDate1 < endDate2 && startDate2 < endDate1;
  };

  // Función para verificar solapamientos con turnos existentes
  const checkForOverlaps = React.useCallback(async () => {
    if (!selectedGuard || !start || !end) {
      setHasOverlap(false);
      setOverlapMessage("");
      return;
    }

    try {
      // Obtener turnos existentes del guardia
      const response = await listShiftsByGuard(selectedGuard.id);
      const shifts = Array.isArray(response) ? response : (response as any)?.results || [];
      
      setExistingShifts(shifts);

      // Verificar solapamientos
      const overlappingShifts = shifts.filter((shift: any) => {
        const shiftStart = shift.start_time || shift.startTime || shift.start;
        const shiftEnd = shift.end_time || shift.endTime || shift.end;
        
        if (!shiftStart || !shiftEnd) return false;
        
        return checkTimeOverlap(start, end, shiftStart, shiftEnd);
      });

      if (overlappingShifts.length > 0) {
        setHasOverlap(true);
        const dates = overlappingShifts.map((shift: any) => {
          const shiftStart = shift.start_time || shift.startTime || shift.start;
          return new Date(shiftStart).toLocaleDateString();
        }).join(", ");
        setOverlapMessage(`Solapamiento detectado con turnos existentes en: ${dates}`);
      } else {
        setHasOverlap(false);
        setOverlapMessage("");
      }
    } catch (error) {
      console.error("Error verificando solapamientos:", error);
    }
  }, [selectedGuard, start, end]);

  // useEffect para verificar solapamientos cuando cambien los datos
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkForOverlaps();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [checkForOverlaps]);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!start || !end) {
      toast.error((TEXT as any)?.shifts?.errors?.missingDates ?? "Start and end are required");
      return;
    }

    // Verificar solapamientos antes de enviar
    if (hasOverlap) {
      toast.error("No se puede crear el turno debido a solapamientos detectados");
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
    } catch (err: any) {
      console.error(err);
      
      // Manejo específico de errores
      let errorMessage = (TEXT as any)?.shifts?.errors?.createFailed ?? "Could not create shift";
      
      if (err?.response?.data?.message || err?.message) {
        const serverMessage = err?.response?.data?.message || err?.message;
        
        // Detectar errores de solapamiento
        if (serverMessage.toLowerCase().includes('overlap') || 
            serverMessage.toLowerCase().includes('solapado') ||
            serverMessage.toLowerCase().includes('conflicto') ||
            serverMessage.toLowerCase().includes('conflict')) {
          errorMessage = "Este turno se solapa con otro turno existente. Por favor, verifica las fechas y horarios.";
        } 
        // Detectar errores de disponibilidad del guardia
        else if (serverMessage.toLowerCase().includes('disponib') ||
                 serverMessage.toLowerCase().includes('available') ||
                 serverMessage.toLowerCase().includes('busy')) {
          errorMessage = "El guardia no está disponible en el horario seleccionado.";
        }
        // Detectar errores de validación de datos
        else if (serverMessage.toLowerCase().includes('validación') ||
                 serverMessage.toLowerCase().includes('validation') ||
                 serverMessage.toLowerCase().includes('invalid')) {
          errorMessage = `Datos inválidos: ${serverMessage}`;
        }
        // Usar mensaje del servidor si es descriptivo
        else if (serverMessage.length > 10) {
          errorMessage = serverMessage;
        }
      }
      
      toast.error(errorMessage);
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
                        // Limpiar query para que use guardLabel
                        setGuardQuery("");
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
                className={cn(
                  "w-full rounded border px-3 py-2",
                  hasOverlap && "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                )}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">End</label>
              <input
                type="datetime-local"
                className={cn(
                  "w-full rounded border px-3 py-2",
                  hasOverlap && "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500"
                )}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Mensaje de solapamiento */}
          {hasOverlap && overlapMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Solapamiento Detectado
                  </h3>
                  <div className="mt-1 text-sm text-red-700">
                    {overlapMessage}
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <Button type="submit" disabled={loading || hasOverlap}>
                {loading ? (TEXT as any)?.actions?.saving ?? "Saving..." : (TEXT as any)?.actions?.create ?? "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
