"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Trash,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon2,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

import CreateShift from "@/components/Shifts/Create/Create";
import ShowShift from "@/components/Shifts/Show/Show";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";
import type { Shift } from "@/components/Shifts/types";
import { listShiftsByGuard } from "@/lib/services/shifts";
import { getProperty } from "@/lib/services/properties";
import type { AppProperty } from "@/lib/services/properties";

/**
 * Normaliza la respuesta del backend a la forma `Shift` que espera la UI.
 */
function normalizeShiftsArray(input: any): Shift[] {
  if (!input) return [];
  const arr = Array.isArray(input)
    ? input
    : Array.isArray(input?.results)
    ? input.results
    : Array.isArray(input?.items)
    ? input.items
    : null;
  if (!arr) return [];
  return arr.map((s: any) => {
    const guardId =
      s.guard ??
      s.guard_id ??
      (s.guard_details
        ? s.guard_details.id ?? s.guard_details.pk ?? undefined
        : undefined) ??
      (s.guard && typeof s.guard === "object" ? s.guard.id : undefined);

    const propertyId =
      s.property ??
      s.property_id ??
      (s.property_details
        ? s.property_details.id ?? s.property_details.pk ?? undefined
        : undefined) ??
      (s.property && typeof s.property === "object"
        ? s.property.id
        : undefined);

    return {
      id: s.id ?? s.pk ?? 0,
      guard: guardId,
      property: propertyId,
      startTime: s.start_time ?? s.startTime ?? s.start ?? null,
      endTime: s.end_time ?? s.endTime ?? s.end ?? null,
      status: s.status ?? "scheduled",
      hoursWorked: s.hours_worked ?? s.hoursWorked ?? s.hours ?? 0,
      isActive: s.is_active ?? s.isActive ?? true,
      __raw: s,
    } as Shift;
  });
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

type Props = {
  guardId: number;
  guardName?: string;
  open: boolean;
  onClose: () => void;
};

export default function GuardsShiftsModal({
  guardId,
  guardName,
  open,
  onClose,
}: Props) {
  const { TEXT } = useI18n();

  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [hasNext, setHasNext] = React.useState<boolean>(false);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );
  const [daysWithShifts, setDaysWithShifts] = React.useState<Date[]>([]);

  // Estados para filtros avanzados
  const [startDate, setStartDate] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewMode, setViewMode] = React.useState<"week" | "month" | "year">("week");
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Función para calcular días según viewMode
  const getDaysForViewMode = React.useMemo(() => {
    if (viewMode === "week") {
      // Find the Monday of the week containing startDate
      const d = new Date(startDate);
      const dayOfWeek = d.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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

  // Funciones de navegación
  function moveBack() {
    if (viewMode === "week") {
      const nd = new Date(startDate);
      nd.setDate(startDate.getDate() - 7);
      setStartDate(nd);
    } else if (viewMode === "month") {
      const nd = new Date(startDate);
      nd.setMonth(startDate.getMonth() - 1, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    } else {
      const nd = new Date(startDate);
      nd.setFullYear(startDate.getFullYear() - 1, 0, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    }
  }

  function moveNext() {
    if (viewMode === "week") {
      const nd = new Date(startDate);
      nd.setDate(startDate.getDate() + 7);
      setStartDate(nd);
    } else if (viewMode === "month") {
      const nd = new Date(startDate);
      nd.setMonth(startDate.getMonth() + 1, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    } else {
      const nd = new Date(startDate);
      nd.setFullYear(startDate.getFullYear() + 1, 0, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    }
  }

  function goToday() {
    const nd = new Date();
    nd.setHours(0, 0, 0, 0);
    setStartDate(nd);
  }

  // Función para manejar el cambio de mes seleccionado
  function handleMonthChange(month: Date) {
    setSelectedMonth(month);
    setViewMode("month");
    const newStartDate = new Date(month);
    newStartDate.setDate(1);
    newStartDate.setHours(0, 0, 0, 0);
    setStartDate(newStartDate);
  }

  // Cache de propiedades { [id]: AppProperty | null }
  const [propertyMap, setPropertyMap] = React.useState<
    Record<number, AppProperty | null>
  >({});
  const [loadingProps, setLoadingProps] = React.useState<boolean>(false);

  // Cache de guardias para búsqueda rápida
  const [allGuardsCache, setAllGuardsCache] = React.useState<any[]>([]);
  const [guardsCacheLoaded, setGuardsCacheLoaded] = React.useState<boolean>(false);

  const filteredShifts = React.useMemo(() => {
    if (!selectedDate) return shifts; // Show all shifts when no date selected
    return shifts.filter((shift) => {
      if (!shift.startTime) return false;
      const shiftDate = new Date(shift.startTime);
      return isSameDay(shiftDate, selectedDate);
    });
  }, [shifts, selectedDate]);

  // Calcular días con turnos basado en el viewMode actual
  const daysWithShiftsFiltered = React.useMemo(() => {
    const daysSet = new Set<string>();
    shifts.forEach((shift) => {
      if (shift.startTime) {
        const date = new Date(shift.startTime);
        date.setHours(0, 0, 0, 0);
        // Solo incluir días que estén en el rango del viewMode actual
        if (getDaysForViewMode.some(viewDay => isSameDay(viewDay, date))) {
          daysSet.add(date.toDateString());
        }
      }
    });
    return Array.from(daysSet).map((dateStr) => new Date(dateStr));
  }, [shifts, getDaysForViewMode]);

  // getProperty label: devuelve string | null (null = no hay nombre aún)
  function getPropertyLabelForShift(s: Shift): string | null {
    const raw = (s as any).__raw;
    const rawName =
      raw?.property_details?.name ?? raw?.property_details?.alias ?? null;
    if (rawName) {
      const idPart = raw?.property_details?.id ?? s.property;
      return `${rawName}${idPart ? ` #${idPart}` : ""}`;
    }

    if (s.property != null) {
      const id = Number(s.property);
      const p = propertyMap[id];
      if (p) {
        const name = p.name ?? p.alias ?? p.address ?? `Property ${p.id}`;
        return `${name} #${p.id}`;
      }
      // todavía no existe nombre en cache
      return null;
    }

    return null;
  }

  // Cargar shifts (primera página o cuando se abre)
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function fetchFirst() {
      setLoading(true);
      try {
        const res = await listShiftsByGuard(guardId, 1, 50, "-start_time");
        const normalized = normalizeShiftsArray(res);
        if (!mounted) return;
        setShifts(normalized);
        setPage(1);
        setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));

        // construir daysWithShifts
        const daysWithShiftsSet = new Set<string>();
        normalized.forEach((shift) => {
          if (shift.startTime) {
            const date = new Date(shift.startTime);
            date.setHours(0, 0, 0, 0);
            daysWithShiftsSet.add(date.toDateString());
          }
        });
        setDaysWithShifts(
          Array.from(daysWithShiftsSet).map((dateStr) => {
            const d = new Date(dateStr);
            d.setHours(0, 0, 0, 0);
            return d;
          })
        );

        // cargar propiedades faltantes
        const propIds = Array.from(
          new Set(
            normalized
              .map((s) => s.property)
              .filter((id) => id != null)
              .map((id) => Number(id))
          )
        ).filter((id) => !Number.isNaN(id) && propertyMap[id] === undefined);

        if (propIds.length > 0) {
          await fetchAndCacheProperties(propIds);
        }
      } catch (err) {
        console.error("[ShiftsModal] error fetching:", err);
        toast.error(
          TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFirst();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guardId]);

  // Precargar cache de guardias para búsqueda rápida
  React.useEffect(() => {
    if (!open || guardsCacheLoaded) return;

    let mounted = true;
    const loadGuardsCache = async () => {
      try {
        // console.log("Precargando cache de guardias...");
        const { listGuards } = await import("@/lib/services/guard");
        const guardsResponse = await listGuards(1, "", 1000); // Cargar hasta 1000 guardias para cache
        const guardsData = Array.isArray(guardsResponse) ? guardsResponse : (guardsResponse as any)?.results || [];

        if (!mounted) return;

        setAllGuardsCache(guardsData);
        setGuardsCacheLoaded(true);
        // console.log(`✅ Precargadas ${guardsData.length} guardias en cache`);
      } catch (error) {
        console.error("❌ Error precargando cache de guardias:", error);
      }
    };

    loadGuardsCache();

    return () => {
      mounted = false;
    };
  }, [open, guardsCacheLoaded]);

  // Limpiar selectedDate cuando cambia viewMode
  React.useEffect(() => {
    setSelectedDate(undefined);
  }, [viewMode]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await listShiftsByGuard(guardId, nextPage, 50, "-start_time");
      const newItems = normalizeShiftsArray(res);
      setShifts((p) => [...p, ...newItems]);
      setPage(nextPage);
      setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));

      const daysWithShiftsSet = new Set(
        daysWithShifts.map((d) => d.toDateString())
      );
      newItems.forEach((shift) => {
        if (shift.startTime) {
          const date = new Date(shift.startTime);
          daysWithShiftsSet.add(date.toDateString());
        }
      });
      setDaysWithShifts(
        Array.from(daysWithShiftsSet).map((dateStr) => new Date(dateStr))
      );

      // fetch propiedades de nuevos items si faltan
      const propIds = Array.from(
        new Set(
          newItems
            .map((s) => s.property)
            .filter((id) => id != null)
            .map((id) => Number(id))
        )
      ).filter((id) => !Number.isNaN(id) && propertyMap[id] === undefined);

      if (propIds.length > 0) {
        await fetchAndCacheProperties(propIds);
      }
    } catch (err) {
      console.error("[LoadMore] error:", err);
      toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts");
    } finally {
      setLoading(false);
    }
  }

  // Función para pedir y cachear propiedades por ids
  async function fetchAndCacheProperties(ids: number[]) {
    if (!ids || ids.length === 0) return;
    setLoadingProps(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => getProperty(id)));
      setPropertyMap((prev) => {
        const next = { ...prev };
        results.forEach((r, idx) => {
          const id = ids[idx];
          if (r.status === "fulfilled") {
            next[id] = r.value ?? null;
          } else {
            console.error(`getProperty(${id}) failed`, r.reason);
            next[id] = null;
          }
        });
        return next;
      });
    } finally {
      setLoadingProps(false);
    }
  }

  function handleCreated(s: Shift) {
    setShifts((p) => [s, ...p]);
    setOpenCreate(false);

    if (s.startTime) {
      const newDate = new Date(s.startTime);
      const dateExists = daysWithShifts.some((d) => isSameDay(d, newDate));
      if (!dateExists) {
        setDaysWithShifts((prev) => [...prev, newDate]);
      }
    }

    // si el nuevo shift trae property_details en raw, cachearlo
    const raw = (s as any).__raw;
    const propId = s.property != null ? Number(s.property) : undefined;
    if (propId && raw?.property_details) {
      setPropertyMap((p) => ({ ...p, [propId]: raw.property_details }));
    } else if (propId && propertyMap[propId] === undefined) {
      void fetchAndCacheProperties([propId]);
    }

    toast.success(TEXT?.shifts?.messages?.created ?? "Shift created");
  }

  function handleUpdated(s: Shift) {
    setShifts((p) => p.map((x) => (x.id === s.id ? s : x)));
    setOpenShowId(null);
    setOpenEditId(null);
    setOpenDeleteId(null);

    const daysWithShiftsSet = new Set<string>();
    shifts
      .map((shift) => (shift.id === s.id ? s : shift))
      .forEach((shift) => {
        if (shift.startTime) {
          const date = new Date(shift.startTime);
          daysWithShiftsSet.add(date.toDateString());
        }
      });
    setDaysWithShifts(
      Array.from(daysWithShiftsSet).map((dateStr) => new Date(dateStr))
    );

    // actualizar cache si viene property_details
    const raw = (s as any).__raw;
    const propId = s.property != null ? Number(s.property) : undefined;
    if (propId && raw?.property_details) {
      setPropertyMap((p) => ({ ...p, [propId]: raw.property_details }));
    } else if (propId && propertyMap[propId] === undefined) {
      void fetchAndCacheProperties([propId]);
    }

    toast.success(TEXT?.shifts?.messages?.updated ?? "Shift updated");
  }

  function handleDeleted(id: number) {
    setShifts((p) => p.filter((x) => x.id !== id));
    setOpenShowId(null);
    setOpenEditId(null);
    setOpenDeleteId(null);

    const remainingShifts = shifts.filter((x) => x.id !== id);
    const daysWithShiftsSet = new Set<string>();
    remainingShifts.forEach((shift) => {
      if (shift.startTime) {
        const date = new Date(shift.startTime);
        daysWithShiftsSet.add(date.toDateString());
      }
    });
    setDaysWithShifts(
      Array.from(daysWithShiftsSet).map((dateStr) => new Date(dateStr))
    );

    toast.success(TEXT?.shifts?.messages?.deleted ?? "Shift deleted");
  }

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openShowId, setOpenShowId] = React.useState<number | null>(null);
  const [openEditId, setOpenEditId] = React.useState<number | null>(null);
  const [openDeleteId, setOpenDeleteId] = React.useState<number | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
    >
      {/* Hacemos el DialogContent un flex column para que el footer quede fuera del área scrolleable */}
      <DialogContent size="xl" className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="space-y-4">
            {/* Título */}
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle className="text-lg">
                  {guardName
                    ? `${TEXT?.shifts?.show?.title ?? "Turnos"} | ${guardName}`
                    : TEXT?.shifts?.show?.title ?? "Turnos"}
                </DialogTitle>
                <div className="text-xs text-muted-foreground">
                  {selectedDate
                    ? `Turnos para ${selectedDate.toLocaleDateString()}`
                    : viewMode === "week"
                    ? `Semana del ${getDaysForViewMode[0]?.toLocaleDateString()} al ${getDaysForViewMode[6]?.toLocaleDateString()}`
                    : viewMode === "month"
                    ? `${startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
                    : `Año ${startDate.getFullYear()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setOpenCreate(true)}
                  disabled={!selectedDate}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {TEXT?.shifts?.create?.title ?? TEXT?.actions?.create ?? "Crear"}
                </Button>
              </div>
            </div>

            {/* Controles de filtros avanzados */}
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
              {/* Navegación temporal */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={moveBack}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="sm" onClick={goToday}>
                  <CalendarIcon2 className="h-4 w-4 mr-1" />
                  Hoy
                </Button>

                <Button variant="outline" size="sm" onClick={moveNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Selector de vista */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Vista:</span>
                <Select value={viewMode} onValueChange={(value: "week" | "month" | "year") => setViewMode(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                    <SelectItem value="year">Año</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de mes (solo visible en vista mes) */}
              {viewMode === "month" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Mes:</span>
                  <Select
                    value={selectedMonth.toISOString()}
                    onValueChange={(value) => handleMonthChange(new Date(value))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const date = new Date(startDate.getFullYear(), i, 1);
                        return (
                          <SelectItem key={i} value={date.toISOString()}>
                            {date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Área principal: le damos flex-1 y min-h-0 para que el ScrollArea pueda controlar el scroll */}
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left column: Calendar */}
          <div className="w-80 flex-shrink-0">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendario
              </h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasShifts: daysWithShiftsFiltered,
                }}
                modifiersStyles={{
                  hasShifts: {
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    fontWeight: "bold",
                  },
                }}
                className="rounded-md border-0"
                month={viewMode === "month" ? startDate : undefined}
                defaultMonth={viewMode === "month" ? startDate : undefined}
              />
              <div className="mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary"></div>
                  <span>Días con turnos</span>
                </div>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="mt-2 h-6 px-2 text-xs"
                  >
                    Ver todos los turnos
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Shifts list (ScrollArea integrado) */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* ScrollArea ocupa todo el espacio disponible y no empuja el footer */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-3 pr-4 p-3">
                {/* Skeleton cuando cargan la lista (primer fetch) */}
                {loading && shifts.length === 0 ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-4 rounded-md border p-3 shadow-sm bg-card"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-muted-foreground">
                            <div className="h-5 w-5 rounded bg-muted/30 animate-pulse" />
                          </div>
                          <div className="w-full">
                            <div className="h-3 w-24 rounded bg-muted/30 animate-pulse mb-2"></div>
                            <div className="h-4 w-40 rounded bg-muted/30 animate-pulse mb-1"></div>
                            <div className="h-3 w-28 rounded bg-muted/30 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted/30 animate-pulse" />
                          <div className="h-8 w-8 rounded-full bg-muted/30 animate-pulse" />
                          <div className="h-8 w-8 rounded-full bg-muted/30 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredShifts.length === 0 ? (
                  // Mostrar 5 filas vacías cuando no hay turnos
                  <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="flex items-center justify-between gap-4 rounded-md border border-dashed border-muted/30 p-3 shadow-sm bg-muted/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-muted-foreground">
                            <CalendarIcon className="h-5 w-5 opacity-50" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground italic">
                              Sin turno asignado
                            </div>
                            <div className="text-xs text-muted-foreground">
                              -
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                          <div className="h-8 w-8 rounded-full bg-muted/20" />
                          <div className="h-8 w-8 rounded-full bg-muted/20" />
                          <div className="h-8 w-8 rounded-full bg-muted/20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  filteredShifts.map((s) => {
                    const propertyLabel = getPropertyLabelForShift(s);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-4 rounded-md border p-3 shadow-sm bg-card"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-muted-foreground">
                            <CalendarIcon className="h-5 w-5" />
                          </div>
                          <div>
                            {!selectedDate && s.startTime && (
                              <div className="text-xs text-muted-foreground mb-1">
                                {new Date(s.startTime).toLocaleDateString()}
                              </div>
                            )}

                            {/* Nombre de la propiedad destacado / skeleton si está cargando */}
                            <div className="text-sm font-semibold">
                              {propertyLabel !== null ? (
                                propertyLabel
                              ) : loadingProps ? (
                                <span className="inline-block h-4 w-44 rounded bg-muted/30 animate-pulse" />
                              ) : s.property != null ? (
                                `Property ID: ${s.property}`
                              ) : (
                                "-"
                              )}
                            </div>

                            {/* Rango horario */}
                            <div className="text-sm">
                              {s.startTime
                                ? new Date(s.startTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}{" "}
                              —{" "}
                              {s.endTime
                                ? new Date(s.endTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </div>

                            {/* Estado y horas trabajadas */}
                            <div className="text-xs text-muted-foreground">
                              {s.status} · {s.hoursWorked}h
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setOpenShowId(s.id)}
                            title={TEXT?.actions?.view ?? "Ver"}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setOpenEditId(s.id)}
                            title={TEXT?.actions?.edit ?? "Editar"}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => setOpenDeleteId(s.id)}
                            title={TEXT?.actions?.delete ?? "Eliminar"}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center w-full gap-2">
            {hasNext ? (
              <>
                <div className="flex-1">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm
                               disabled:opacity-70 disabled:cursor-not-allowed
                               focus:outline-none focus:ring-2 focus:ring-offset-0 text-white bg-black"
                    aria-label={
                      loading
                        ? TEXT?.common?.loading ?? "Loading..."
                        : TEXT?.actions?.refresh ?? "Cargar más"
                    }
                  >
                    {loading ? (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {loading
                        ? TEXT?.common?.loading ?? "Loading..."
                        : TEXT?.actions?.refresh ?? "Cargar más"}
                    </span>
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="text-sm px-3 py-2 bg-transparent"
                  >
                    {TEXT?.actions?.close ?? "Close"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="ml-auto">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="text-sm px-3 py-2 bg-transparent"
                >
                  {TEXT?.actions?.close ?? "Close"}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <CreateShift
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        guardId={guardId}
        selectedDate={selectedDate}
        preloadedGuards={allGuardsCache}
        onCreated={handleCreated}
      />

      {openShowId !== null && (
        <ShowShift
          open={openShowId !== null}
          onClose={() => setOpenShowId(null)}
          shiftId={openShowId as number}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {openEditId !== null && (
        <EditShift
          open={openEditId !== null}
          onClose={() => setOpenEditId(null)}
          shiftId={openEditId as number}
          onUpdated={handleUpdated}
        />
      )}

      {openDeleteId !== null && (
        <DeleteShift
          open={openDeleteId !== null}
          onClose={() => setOpenDeleteId(null)}
          shiftId={openDeleteId as number}
          onDeleted={handleDeleted}
        />
      )}
    </Dialog>
  );
}
