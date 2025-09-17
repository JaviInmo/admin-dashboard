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
import { listGuards, getGuard } from "@/lib/services/guard";
import { listProperties } from "@/lib/services/properties";
import { listServicesByProperty } from "@/lib/services/services";
import { listWeaponsByGuard } from "@/lib/services/weapons";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";
import type { Service as AppService } from "@/components/Services/types";
import type { Weapon } from "@/components/Weapons/types";


type CreateShiftProps = {
  open: boolean;
  onClose: () => void;
  guardId?: number;
  selectedDate?: Date;
  propertyId?: number | null;
  preselectedProperty?: AppProperty | null;
  preselectedService?: AppService | null;
  preloadedProperties?: AppProperty[];
  preloadedGuard?: Guard | null;
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
  preselectedProperty = null,
  preselectedService = null,
  preloadedProperties = [],
  preloadedGuard = null,
  onCreated,
}: CreateShiftProps) {
  const { TEXT } = useI18n();

  const guardPlaceholder =
    (TEXT as any)?.guards?.table?.searchPlaceholder ??
    "Buscar guard por nombre o email...";
  const propertyPlaceholder =
    (TEXT as any)?.properties?.table?.searchPlaceholder ?? "Buscar propiedades...";

  const [selectedGuard, setSelectedGuard] = React.useState<Guard | null>(null);
  const [guardQuery, setGuardQuery] = React.useState<string>("");
  const debouncedGuardQuery = useDebouncedValue(guardQuery, 300);
  const [guardResults, setGuardResults] = React.useState<Guard[]>([]);
  const [allGuards, setAllGuards] = React.useState<Guard[]>([]); // Pre-loaded guards cache
  const [guardsLoading, setGuardsLoading] = React.useState(false);
  const [guardDropdownOpen, setGuardDropdownOpen] = React.useState(false);

  const [selectedProperty, setSelectedProperty] = React.useState<AppProperty | null>(null);
  const [propertyQuery, setPropertyQuery] = React.useState<string>("");
  const debouncedPropertyQuery = useDebouncedValue(propertyQuery, 300);
  const [propertyResults, setPropertyResults] = React.useState<AppProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = React.useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = React.useState(false);

  // --- Service selection from property ---
  const [selectedService, setSelectedService] = React.useState<AppService | null>(null);
  const [propertyServices, setPropertyServices] = React.useState<AppService[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(false);

  // PLANNED dates only (create)
  const [plannedStart, setPlannedStart] = React.useState<string>("");
  const [plannedEnd, setPlannedEnd] = React.useState<string>("");

  const [loading, setLoading] = React.useState(false);

  // is_armed (opcional) + weapons
  const [isArmed, setIsArmed] = React.useState<boolean>(false);
  const [weapons, setWeapons] = React.useState<Weapon[]>([]);
  const [weaponsLoading, setWeaponsLoading] = React.useState(false);
  const [selectedWeaponId, setSelectedWeaponId] = React.useState<number | null>(null);
  const [selectedWeaponSerial, setSelectedWeaponSerial] = React.useState<string | null>(null);
  const [manualSerial, setManualSerial] = React.useState<string>("");

  // overlap detection (based on planned times)
  const [hasOverlap, setHasOverlap] = React.useState<boolean>(false);
  const [overlapMessage, setOverlapMessage] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) {
      setSelectedGuard(null);
      setGuardQuery("");
      setGuardResults([]);
      setAllGuards([]);
      setGuardsLoading(false);
      setGuardDropdownOpen(false);

      setSelectedProperty(null);
      setPropertyQuery("");
      setPropertyResults([]);
      setPropertiesLoading(false);
      setPropertyDropdownOpen(false);

      setSelectedService(null);
      setPropertyServices([]);
      setServicesLoading(false);

      setPlannedStart("");
      setPlannedEnd("");
      setIsArmed(false);
      setWeapons([]);
      setSelectedWeaponId(null);
      setSelectedWeaponSerial(null);
      setManualSerial("");

      setHasOverlap(false);
      setOverlapMessage("");
    }
  }, [open]);

  // Pre-load guards when modal opens
  React.useEffect(() => {
    if (!open) return;
    
    let mounted = true;
    setGuardsLoading(true);
    
    (async () => {
      try {
        // Load first 100 guards to have them ready for search
        const response = await listGuards(1, "", 100);
        if (!mounted) return;
        
        const guards = extractItems<Guard>(response);
        setAllGuards(guards);
        setGuardResults(guards); // Initially show all guards
      } catch (err) {
        console.error("Error pre-loading guards:", err);
        setAllGuards([]);
        setGuardResults([]);
      } finally {
        if (mounted) setGuardsLoading(false);
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, [open]);

  // initial planned defaults
  React.useEffect(() => {
    if (!open) return;
    const targetDate = selectedDate || new Date();

    const startDate = new Date(targetDate);
    startDate.setHours(8, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(16, 0, 0, 0);

    const toLocalDateTimeInput = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const YYYY = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const DD = pad(d.getDate());
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
    };

    setPlannedStart(toLocalDateTimeInput(startDate));
    setPlannedEnd(toLocalDateTimeInput(endDate));
  }, [open, selectedDate]);

  React.useEffect(() => {
    if (!open) return;

    if (preselectedProperty) {
      setSelectedProperty(preselectedProperty);
      setPropertyQuery("");
      return;
    }

    if (!propertyId) return;

    if (preloadedProperties.length > 0) {
      const property = preloadedProperties.find(
        (p) => Number(p.id) === Number(propertyId) || String(p.id) === String(propertyId),
      );

      if (property) {
        setSelectedProperty(property);
        setPropertyQuery("");
        return;
      }
    }

    let mounted = true;
    (async () => {
      try {
        const properties = await listProperties(1, "", 1000);
        if (!mounted) return;

        const items = extractItems<AppProperty>(properties);
        const property = items.find((p) => Number(p.id) === propertyId);

        if (property) {
          setSelectedProperty(property);
          setPropertyQuery("");
        }
      } catch (err) {
        console.error("❌ Error al consultar propiedad:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [propertyId, open, preloadedProperties, preselectedProperty]);

  // Handle preselected service
  React.useEffect(() => {
    if (!open) return;

    if (preselectedService) {
      setSelectedService(preselectedService);
      // The timing pre-population will be handled by the selectedService useEffect
    }
  }, [preselectedService, open]);

  React.useEffect(() => {
    if (!open) return;
    if (!guardId) return;

    if (preloadedGuard && preloadedGuard.id === guardId) {
      setSelectedGuard(preloadedGuard);
      setGuardQuery("");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const g = await getGuard(guardId);
        if (!mounted) return;
        setSelectedGuard(g);
        setGuardQuery("");
      } catch (err) {
        console.error("prefill guard failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [guardId, open, preloadedGuard]);

  // when selectedGuard changes -> fetch weapons for that guard
  React.useEffect(() => {
    let mounted = true;
    async function loadWeapons() {
      setWeapons([]);
      setSelectedWeaponId(null);
      setSelectedWeaponSerial(null);
      setManualSerial("");
      if (!selectedGuard?.id) return;
      setWeaponsLoading(true);
      try {
        const res = await listWeaponsByGuard(selectedGuard.id, 1, 1000);
        if (!mounted) return;
        const items = extractItems<Weapon>(res);
        setWeapons(items);
      } catch (err) {
        console.error("Error fetching weapons for guard:", err);
        setWeapons([]);
      } finally {
        if (mounted) setWeaponsLoading(false);
      }
    }
    loadWeapons();
    return () => {
      mounted = false;
    };
  }, [selectedGuard]);

  // guards search - now uses pre-loaded cache first
  React.useEffect(() => {
    const q = (debouncedGuardQuery ?? "").trim();
    
    if (q === "") {
      // Show all pre-loaded guards when no search query
      setGuardResults(allGuards);
      if (allGuards.length > 0) setGuardDropdownOpen(true);
      return;
    }

    // First, search in pre-loaded cache
    const localResults = allGuards.filter(guard => {
      const fullName = `${guard.firstName || ""} ${guard.lastName || ""}`.toLowerCase();
      const email = (guard.email || "").toLowerCase();
      const query = q.toLowerCase();
      
      return fullName.includes(query) || email.includes(query);
    });

    if (localResults.length >= 3 || allGuards.length === 0) {
      // Use local results if we have enough, or if cache is empty (fallback to API)
      setGuardResults(localResults);
      setGuardDropdownOpen(true);
      
      // If cache is empty, try API as fallback
      if (allGuards.length === 0) {
        let mounted = true;
        setGuardsLoading(true);
        (async () => {
          try {
            const res = await listGuards(1, q, 10);
            if (!mounted) return;
            const items = extractItems<Guard>(res);
            setGuardResults(items);
            setGuardDropdownOpen(true);
          } catch (err) {
            console.error("listGuards API fallback error", err);
            setGuardResults(localResults); // Keep local results even if API fails
          } finally {
            if (mounted) setGuardsLoading(false);
          }
        })();
        return () => {
          mounted = false;
        };
      }
    } else {
      // If local results are insufficient, supplement with API call
      let mounted = true;
      setGuardsLoading(true);
      (async () => {
        try {
          const res = await listGuards(1, q, 10);
          if (!mounted) return;
          const apiItems = extractItems<Guard>(res);
          
          // Combine local and API results, avoiding duplicates
          const localIds = new Set(localResults.map(g => g.id));
          const newItems = apiItems.filter(g => !localIds.has(g.id));
          const combinedResults = [...localResults, ...newItems];
          
          setGuardResults(combinedResults);
          setGuardDropdownOpen(true);
        } catch (err) {
          console.error("listGuards supplemental error", err);
          setGuardResults(localResults); // Fallback to local results
          setGuardDropdownOpen(true);
        } finally {
          if (mounted) setGuardsLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    }
  }, [debouncedGuardQuery, allGuards]);

  // properties search
  React.useEffect(() => {
    let mounted = true;
    const q = (debouncedPropertyQuery ?? "").trim();
    if (q === "") {
      setPropertyResults([]);
      return;
    }

    setPropertiesLoading(true);

    if (preloadedProperties.length > 0) {
      const filtered = preloadedProperties
        .filter(
          (prop) =>
            (prop.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
            (prop.alias ?? "").toLowerCase().includes(q.toLowerCase()) ||
            (prop.address ?? "").toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 10);

      if (mounted) {
        setPropertyResults(filtered);
        setPropertyDropdownOpen(true);
        setPropertiesLoading(false);

        if (filtered.length < 3 && q.length >= 2) {
          (async () => {
            try {
              const res = await listProperties(1, q, 10);
              if (!mounted) return;
              const apiItems = extractItems<AppProperty>(res);

              const cacheIds = new Set(filtered.map((p) => p.id));
              const newItems = apiItems.filter((p) => !cacheIds.has(p.id));
              const combinedResults = [...filtered, ...newItems];

              setPropertyResults(combinedResults);
            } catch (err) {
              console.error("Error en búsqueda complementaria:", err);
              setPropertyResults(filtered);
            }
          })();
        }
      }
      return;
    }

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
  }, [debouncedPropertyQuery, preloadedProperties]);

  // Load services when property changes
  React.useEffect(() => {
    if (!selectedProperty?.id) {
      setPropertyServices([]);
      setSelectedService(null);
      return;
    }

    let mounted = true;
    setServicesLoading(true);
    
    (async () => {
      try {
        const response = await listServicesByProperty(selectedProperty.id, 1, "", 100);
        if (!mounted) return;
        
        // Extract services array from different response formats
        let services: AppService[] = [];
        if (Array.isArray(response)) {
          services = response;
        } else if (response?.items) {
          services = response.items;
        } else if ((response as any)?.results) {
          services = (response as any).results;
        }
        
        setPropertyServices(services);
        
        // Clear selected service if it's not in the new list
        if (selectedService && !services.find(s => s.id === selectedService.id)) {
          setSelectedService(null);
        }
      } catch (err) {
        console.error("Error loading property services:", err);
        setPropertyServices([]);
        setSelectedService(null);
      } finally {
        if (mounted) setServicesLoading(false);
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, [selectedProperty?.id, selectedService]);

  // Pre-populate shift times when a service is selected
  React.useEffect(() => {
    if (!selectedService || !open) return;

    const { startTime, endTime } = selectedService;

    // If service has defined times, use them to populate shift times
    if (startTime && endTime) {
      const targetDate = selectedDate || new Date();
      
      // Parse service times (assuming HH:MM:SS format)
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours: isNaN(hours) ? 0 : hours, minutes: isNaN(minutes) ? 0 : minutes };
      };

      const startTimeObj = parseTime(startTime);
      const endTimeObj = parseTime(endTime);

      // Create datetime strings for the target date with service times
      const startDate = new Date(targetDate);
      startDate.setHours(startTimeObj.hours, startTimeObj.minutes, 0, 0);

      const endDate = new Date(targetDate);
      endDate.setHours(endTimeObj.hours, endTimeObj.minutes, 0, 0);

      // If end time is before start time, assume it's next day
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const toLocalDateTimeInput = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const YYYY = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const DD = pad(d.getDate());
        const hh = pad(d.getHours());
        const mm = pad(d.getMinutes());
        return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
      };

      setPlannedStart(toLocalDateTimeInput(startDate));
      setPlannedEnd(toLocalDateTimeInput(endDate));
    }

    // If service has an assigned property, pre-select it
    if (selectedService.assignedProperty && selectedService.propertyName) {
      const serviceProperty: AppProperty = {
        id: selectedService.assignedProperty,
        ownerId: 0, // Default value
        name: selectedService.propertyName,
        alias: undefined,
        address: selectedService.propertyName, // Use property name as address fallback
        description: null,
        contractStartDate: null,
        createdAt: null,
        updatedAt: null
      };
      setSelectedProperty(serviceProperty);
      setPropertyQuery("");
    }
  }, [selectedService, selectedDate, open]);

  const guardLabel = (g?: Guard | null) => {
    if (!g) return "";
    return `${g.firstName} ${g.lastName}`;
  };
  const propertyLabel = (p?: AppProperty | null) => {
    if (!p) return "";
    const alias = p.alias || p.name || "Sin nombre";
    const ownerDetails = p.ownerDetails;
    let ownerName = "";
    
    if (ownerDetails) {
      const firstName = ownerDetails.first_name || "";
      const lastName = ownerDetails.last_name || "";
      ownerName = `${firstName} ${lastName}`.trim();
      if (!ownerName) {
        ownerName = ownerDetails.email || `#${p.ownerId}`;
      }
    } else {
      ownerName = `#${p.ownerId}`;
    }
    
    return `${alias} - ${ownerName}`;
  };

  const checkTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const startDate1 = new Date(start1);
    const endDate1 = new Date(end1);
    const startDate2 = new Date(start2);
    const endDate2 = new Date(end2);

    return startDate1 < endDate2 && startDate2 < endDate1;
  };

  const checkForOverlaps = React.useCallback(async () => {
    // overlap check based on plannedStart/plannedEnd
    if (!selectedGuard || !plannedStart || !plannedEnd) {
      setHasOverlap(false);
      setOverlapMessage("");
      return;
    }

    try {
      const response = await listShiftsByGuard(selectedGuard.id, 1, 1000);
      const shifts = extractItems<Shift>(response);

      const overlappingShifts = shifts.filter((shift) => {
        const shiftPlannedStart = (shift as any).plannedStartTime ?? (shift as any).planned_start_time;
        const shiftPlannedEnd = (shift as any).plannedEndTime ?? (shift as any).planned_end_time;

        if (!shiftPlannedStart || !shiftPlannedEnd) return false;

        return checkTimeOverlap(plannedStart, plannedEnd, shiftPlannedStart, shiftPlannedEnd);
      });

      if (overlappingShifts.length > 0) {
        setHasOverlap(true);
        const dates = overlappingShifts
          .map((shift) => {
            const s = (shift as any).plannedStartTime ?? (shift as any).planned_start_time;
            return new Date(s).toLocaleString();
          })
          .join(", ");
        setOverlapMessage(`Solapamiento detectado con turnos planeados en: ${dates}`);
      } else {
        setHasOverlap(false);
        setOverlapMessage("");
      }
    } catch (error) {
      console.error("Error verificando solapamientos:", error);
      setHasOverlap(false);
      setOverlapMessage("");
    }
  }, [selectedGuard, plannedStart, plannedEnd]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkForOverlaps();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [checkForOverlaps]);

  // weaponDetails (informativo local)
  const [weaponDetails, setWeaponDetails] = React.useState<string>("");

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!plannedStart || !plannedEnd) {
      toast.error((TEXT as any)?.shifts?.errors?.missingDates ?? "Planned start and end are required");
      return;
    }

    if (hasOverlap) {
      toast.error("No se puede crear el turno debido a solapamientos detectados (planned times)");
      return;
    }

    const plannedStartIso = toIsoFromDatetimeLocal(plannedStart);
    const plannedEndIso = toIsoFromDatetimeLocal(plannedEnd);

    if (new Date(plannedEndIso) <= new Date(plannedStartIso)) {
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
      const payload: any = {
        guard: selectedGuard.id,
        property: Number(selectedProperty.id),
        planned_start_time: plannedStartIso,
        planned_end_time: plannedEndIso,
      };

      if (selectedService) payload.service = Number(selectedService.id);
      if (typeof isArmed === "boolean") payload.is_armed = isArmed;

      // weapon handling: send weapon id (if selected) and/or serial if available
      if (isArmed) {
        if (selectedWeaponId) payload.weapon = selectedWeaponId;
        const serialToSend = selectedWeaponSerial ?? (manualSerial.trim() !== "" ? manualSerial.trim() : null);
        if (serialToSend) payload.weapon_serial_number = serialToSend;
      }

      const created = await createShift(payload);
      toast.success((TEXT as any)?.shifts?.messages?.created ?? "Shift created");
      onCreated?.(created as Shift);
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMessage = (TEXT as any)?.shifts?.errors?.createFailed ?? "Could not create shift";

      if (err?.response?.data?.message || err?.message) {
        const serverMessage = err?.response?.data?.message || err?.message;

        if (
          serverMessage.toLowerCase().includes("overlap") ||
          serverMessage.toLowerCase().includes("solapado") ||
          serverMessage.toLowerCase().includes("conflicto") ||
          serverMessage.toLowerCase().includes("conflict")
        ) {
          errorMessage = "Este turno planeado se solapa con otro turno existente. Por favor, verifica las fechas y horarios.";
        } else if (
          serverMessage.toLowerCase().includes("disponib") ||
          serverMessage.toLowerCase().includes("available") ||
          serverMessage.toLowerCase().includes("busy")
        ) {
          errorMessage = "El guardia no está disponible en el horario seleccionado.";
        } else if (
          serverMessage.toLowerCase().includes("validación") ||
          serverMessage.toLowerCase().includes("validation") ||
          serverMessage.toLowerCase().includes("invalid")
        ) {
          errorMessage = `Datos inválidos: ${serverMessage}`;
        } else if (serverMessage.length > 10) {
          errorMessage = serverMessage;
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // compact input class
  const inputClass = "w-full rounded border px-3 py-1.5 text-sm";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[80vh] sm:max-h-[70vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="text-base">{(TEXT as any)?.shifts?.create?.title ?? "Crear Turno"}</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3 mt-2 p-2">
          {/* Guard select-search */}
          <div className="relative">
            <label className="text-sm text-muted-foreground block mb-1">Guard</label>
            <input
              type="text"
              className={inputClass}
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
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-40 overflow-auto">
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
              className={inputClass}
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
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-40 overflow-auto">
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
                        setPropertyQuery("");
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

          {/* Service select */}
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Service</label>
            {!selectedProperty ? (
              <div className="w-full rounded border px-3 py-1.5 text-sm text-muted-foreground bg-muted/30">
                Selecciona una propiedad primero
              </div>
            ) : (
              <select
                className={inputClass}
                value={selectedService?.id.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setSelectedService(null);
                  } else {
                    const service = propertyServices.find(s => s.id.toString() === value);
                    setSelectedService(service || null);
                  }
                }}
                disabled={servicesLoading}
              >
                <option value="">-- Seleccionar servicio --</option>
                {servicesLoading && <option value="">Cargando servicios...</option>}
                {!servicesLoading && propertyServices.length === 0 && (
                  <option value="">No hay servicios disponibles</option>
                )}
                {!servicesLoading && propertyServices.map((service) => (
                  <option key={service.id} value={service.id.toString()}>
                    {service.name}{service.description ? ` — ${service.description}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Planned start/end only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Planned Start</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Planned End</label>
              <input
                type="datetime-local"
                className={inputClass}
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
              />
            </div>
          </div>

          {hasOverlap && overlapMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Solapamiento Detectado</h3>
                  <div className="mt-1 text-sm text-red-700">{overlapMessage}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isArmed} onChange={(e) => setIsArmed(Boolean(e.target.checked))} />
              <span className="text-sm">Is armed</span>
            </label>

            {isArmed && (
              <div className="space-y-2">
                <div>
                  <label className="text-sm block mb-1">Select weapon (del guard) — opcional</label>
                  <div>
                    <select
                      value={selectedWeaponId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "__manual") {
                          setSelectedWeaponId(null);
                          setSelectedWeaponSerial(null);
                          return;
                        }
                        if (!val) {
                          setSelectedWeaponId(null);
                          setSelectedWeaponSerial(null);
                          return;
                        }
                        const id = Number(val);
                        setSelectedWeaponId(id);
                        const w = weapons.find((x) => Number(x.id) === id);
                        setSelectedWeaponSerial(w?.serialNumber ?? null);
                        setManualSerial("");
                      }}
                      className={inputClass}
                    >
                      <option value="">-- Select weapon --</option>
                      {!weaponsLoading && weapons.length === 0 && <option value="">(no weapons)</option>}
                      {weaponsLoading && <option value="">Cargando armas...</option>}
                      {weapons.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.model ?? "model"} — {w.serialNumber ?? "no-serial"} (#{w.id})
                        </option>
                      ))}
                      <option value="__manual">Other / Manual serial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm block mb-1">Weapon serial (manual / preview)</label>
                  <input
                    type="text"
                    placeholder="Serial number (manual or selected)"
                    className={inputClass}
                    value={selectedWeaponSerial ?? manualSerial}
                    onChange={(e) => {
                      setManualSerial(e.target.value);
                      setSelectedWeaponSerial(null);
                      setSelectedWeaponId(null);
                    }}
                  />
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {selectedWeaponId ? `Serial seleccionado: ${selectedWeaponSerial ?? ""}` : "Puedes escribir un serial manual si el arma no está en la lista."}
                  </div>
                </div>

                <div>
                  <label className="text-sm block mb-1">Weapon details (informativo)</label>
                  <input
                    type="text"
                    placeholder="Weapon details (informative)"
                    value={weaponDetails}
                    onChange={(e) => setWeaponDetails(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" onClick={onClose} type="button" size="sm">
                {(TEXT as any)?.actions?.close ?? "Close"}
              </Button>
              <Button type="submit" disabled={loading || hasOverlap} size="sm">
                {loading ? (TEXT as any)?.actions?.saving ?? "Saving..." : (TEXT as any)?.actions?.create ?? "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
