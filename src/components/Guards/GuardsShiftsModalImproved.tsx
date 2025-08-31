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
  CalendarIcon,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Trash,
  Filter,
  MapPin,
  Clock,
  BarChart3,
  Download,
  Grid3X3,
  Calendar as CalendarViewIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import CreateShift from "@/components/Shifts/Create/Create";
import ShowShift from "@/components/Shifts/Show/Show";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";
import type { Shift } from "@/components/Shifts/types";
import { listShiftsByGuard } from "@/lib/services/shifts";
import { getProperty } from "@/lib/services/properties";
import type { AppProperty } from "@/lib/services/properties";

// Colores para propiedades - estilo Windows
const PROPERTY_COLORS = [
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#84CC16", // lime-500
];

// Estados con colores
const STATUS_COLORS = {
  scheduled: "#3B82F6", // blue
  completed: "#10B981", // green
  voided: "#EF4444", // red
};

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

type PropertyWithShifts = {
  property: AppProperty;
  shifts: Shift[];
  color: string;
  totalHours: number;
};

type DayWithShifts = {
  date: Date;
  shifts: Shift[];
  properties: PropertyWithShifts[];
};

type Props = {
  guardId: number;
  guardName?: string;
  open: boolean;
  onClose: () => void;
};

export default function GuardsShiftsModalImproved({
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
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | null>(null);
  const [viewMode, setViewMode] = React.useState<"calendar" | "timeline">("calendar");

  // Cache de propiedades { [id]: AppProperty | null }
  const [propertyMap, setPropertyMap] = React.useState<
    Record<number, AppProperty | null>
  >({});
  const [propertyColors, setPropertyColors] = React.useState<Record<number, string>>({});
  const [loadingProps, setLoadingProps] = React.useState<boolean>(false);

  // Datos procesados para el calendario estilo Windows
  const processedData = React.useMemo(() => {
    // Agrupar shifts por fecha
    const dayGroups: Record<string, DayWithShifts> = {};
    
    shifts.forEach((shift) => {
      if (!shift.startTime) return;
      
      const date = new Date(shift.startTime);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = {
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          shifts: [],
          properties: [],
        };
      }
      
      dayGroups[dateKey].shifts.push(shift);
    });

    // Agrupar por propiedades dentro de cada día
    Object.values(dayGroups).forEach((dayData) => {
      const propertyGroups: Record<number, PropertyWithShifts> = {};
      
      dayData.shifts.forEach((shift) => {
        const propId = shift.property ? Number(shift.property) : -1;
        const property = propertyMap[propId] || null;
        
        if (!propertyGroups[propId]) {
          propertyGroups[propId] = {
            property: property || { 
              id: propId, 
              name: `Property ${propId}`, 
              alias: '', 
              address: '' 
            } as AppProperty,
            shifts: [],
            color: propertyColors[propId] || PROPERTY_COLORS[propId % PROPERTY_COLORS.length],
            totalHours: 0,
          };
        }
        
        propertyGroups[propId].shifts.push(shift);
        propertyGroups[propId].totalHours += shift.hoursWorked || 0;
      });
      
      dayData.properties = Object.values(propertyGroups);
    });

    return dayGroups;
  }, [shifts, propertyMap, propertyColors]);

  // Días con turnos para el calendario
  const daysWithShifts = React.useMemo(() => {
    return Object.values(processedData).map(day => day.date);
  }, [processedData]);

  // Propiedades filtradas - SIEMPRE mostrar todas las propiedades del guardia
  const allProperties = React.useMemo(() => {
    // Mostrar todas las propiedades únicas donde el guardia tiene turnos
    const propertyGroups: Record<number, PropertyWithShifts> = {};
    
    shifts.forEach((shift) => {
      const propId = shift.property ? Number(shift.property) : -1;
      const property = propertyMap[propId] || null;
      
      if (!propertyGroups[propId]) {
        propertyGroups[propId] = {
          property: property || { 
            id: propId, 
            name: `Property ${propId}`, 
            alias: '', 
            address: '' 
          } as AppProperty,
          shifts: [],
          color: propertyColors[propId] || PROPERTY_COLORS[propId % PROPERTY_COLORS.length],
          totalHours: 0,
        };
      }
      
      propertyGroups[propId].shifts.push(shift);
      propertyGroups[propId].totalHours += shift.hoursWorked || 0;
    });
    
    return Object.values(propertyGroups);
  }, [shifts, propertyMap, propertyColors]);

  // Shifts filtrados por propiedad seleccionada, ordenados por fecha (más recientes primero)
  const filteredShifts = React.useMemo(() => {
    let result = shifts;
    
    if (selectedDate) {
      // Si hay fecha seleccionada, mostrar solo turnos de ese día
      result = result.filter((shift) => {
        if (!shift.startTime) return false;
        const shiftDate = new Date(shift.startTime);
        return isSameDay(shiftDate, selectedDate);
      });
    } else if (selectedPropertyId !== null) {
      // Si hay propiedad seleccionada, mostrar solo turnos de esa propiedad
      result = result.filter((shift) => {
        return shift.property === selectedPropertyId;
      });
    }
    
    // Ordenar por fecha: último trabajo realizado primero
    return result.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [shifts, selectedDate, selectedPropertyId]);

  // Estadísticas
  const statistics = React.useMemo(() => {
    const total = shifts.length;
    const completed = shifts.filter(s => s.status === 'completed').length;
    const scheduled = shifts.filter(s => s.status === 'scheduled').length;
    const voided = shifts.filter(s => s.status === 'voided').length;
    const totalHours = shifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    
    return { total, completed, scheduled, voided, totalHours };
  }, [shifts]);

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
      return null;
    }

    return null;
  }

  // Asignar colores a propiedades
  React.useEffect(() => {
    const uniquePropertyIds = Array.from(
      new Set(
        shifts
          .map((s) => s.property)
          .filter((id) => id != null)
          .map((id) => Number(id))
      )
    );

    setPropertyColors((prev) => {
      const next = { ...prev };
      uniquePropertyIds.forEach((id, index) => {
        if (!next[id]) {
          next[id] = PROPERTY_COLORS[index % PROPERTY_COLORS.length];
        }
      });
      return next;
    });
  }, [shifts]);

  // Cargar shifts (primera página o cuando se abre)
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function fetchFirst() {
      setLoading(true);
      try {
        const res = await listShiftsByGuard(guardId, 1, 100, "-start_time"); // Más datos iniciales
        const normalized = normalizeShiftsArray(res);
        if (!mounted) return;
        setShifts(normalized);
        setPage(1);
        setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));

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
  }, [open, guardId]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await listShiftsByGuard(guardId, nextPage, 50, "-start_time");
      const newItems = normalizeShiftsArray(res);
      setShifts((p) => [...p, ...newItems]);
      setPage(nextPage);
      setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));

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
      <DialogContent 
        size="full" 
        className="max-h-[95vh] w-[80vw] max-w-none flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between w-full py-2">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg px-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {guardName
                  ? `${TEXT?.shifts?.show?.title ?? "Turnos"} | ${guardName}`
                  : TEXT?.shifts?.show?.title ?? "Turnos"}
              </DialogTitle>
              <div className="text-sm text-muted-foreground px-2 flex items-center gap-4 flex-wrap">
                <span>
                  {selectedDate
                    ? `${selectedDate.toLocaleDateString()}`
                    : "Vista general"}
                </span>
                {selectedPropertyId && (
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    Propiedad filtrada
                  </Badge>
                )}
                <span className="text-xs bg-muted/50 px-2 py-1 rounded">
                  <BarChart3 className="h-3 w-3 inline mr-1" />
                  {statistics.total} turnos • {statistics.totalHours}h total
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pr-1 flex-shrink-0">
              <div className="flex rounded-md border">
                <Button
                  size="sm"
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  onClick={() => setViewMode("calendar")}
                  className="rounded-r-none h-8 px-2"
                >
                  <CalendarViewIcon className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "timeline" ? "default" : "ghost"}
                  onClick={() => setViewMode("timeline")}
                  className="rounded-l-none h-8 px-2"
                >
                  <Grid3X3 className="h-3 w-3" />
                </Button>
              </div>
              
              <Button
                size="sm"
                onClick={() => setOpenCreate(true)}
                disabled={!selectedDate}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                {TEXT?.shifts?.create?.title ?? "Crear"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Área principal con tabs */}
        <div className="flex-1 min-h-0">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="h-full flex flex-col">
            
            <TabsContent value="calendar" className="flex-1 min-h-0">
              <div 
                className="grid grid-cols-12 gap-6 h-full overflow-hidden" 
                style={{ 
                  gap: 'calc(var(--spacing) * 1)',
                  height: 'calc(95vh - 200px)'
                }}
              >
                {/* IZQUIERDA: Calendario con scroll vertical - 4 columnas */}
                <div className="col-span-4">
                  <Card className="h-full flex flex-col gap-0 py-2">
                    <CardContent className="flex-1 min-h-0 p-0">
                      <div className="h-full w-full flex flex-col">
                        <div className="flex flex-col">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="w-full"
                            style={{
                              transform: 'scale(1.0)',
                              transformOrigin: 'center'
                            }}
                            modifiers={{
                              hasShifts: daysWithShifts,
                              selectedProperty: selectedPropertyId ? 
                                shifts
                                  .filter(s => s.property === selectedPropertyId && s.startTime)
                                  .map(s => new Date(s.startTime!))
                                : []
                            }}
                            modifiersStyles={{
                              hasShifts: {
                                backgroundColor: "hsl(var(--primary))",
                                color: "hsl(var(--primary-foreground))",
                                fontWeight: "bold",
                              },
                              selectedProperty: {
                                backgroundColor: selectedPropertyId ? 
                                  propertyColors[selectedPropertyId] || "hsl(var(--primary))" : 
                                  "hsl(var(--primary))",
                                color: "white",
                                fontWeight: "bold",
                                border: "2px solid white",
                              }
                            }}
                            numberOfMonths={1}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* CENTRO: Lista de Propiedades - 4 columnas */}
                <div className="col-span-4">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-0 flex-shrink-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Propiedades
                        {selectedPropertyId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedPropertyId(null)}
                            className="h-6 px-2 text-xs ml-auto"
                          >
                            <Filter className="h-3 w-3 mr-1" />
                            Limpiar
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                      <ScrollArea className="h-full w-full" style={{ maxHeight: 'calc(95vh - 250px)' }}>
                        <div className="space-y-2 p-2 pt-1">
                          {allProperties.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8" style={{ paddingBlock: 'calc(var(--spacing) * 3)' }}>
                              No hay propiedades con turnos
                            </div>
                          ) : (
                            allProperties.map((propData) => (
                              <div
                                key={propData.property.id}
                                className={`p-2 rounded border cursor-pointer transition-all hover:shadow-sm ${
                                  selectedPropertyId === propData.property.id
                                    ? "border-primary bg-primary/10 shadow-sm"
                                    : "border-transparent bg-muted/50 hover:bg-muted"
                                }`}
                                onClick={() => {
                                  setSelectedPropertyId(
                                    selectedPropertyId === propData.property.id 
                                      ? null 
                                      : propData.property.id
                                  );
                                  // Limpiar selección de fecha al seleccionar propiedad
                                  setSelectedDate(undefined);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 border border-white shadow-sm"
                                    style={{ backgroundColor: propData.color }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs mb-1">
                                      {propData.property.name || propData.property.alias || `Propiedad ${propData.property.id}`}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <CalendarIcon className="h-3 w-3" />
                                        {propData.shifts.length}
                                      </span>
                                      {propData.totalHours > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {propData.totalHours}h
                                        </span>
                                      )}
                                    </div>
                                    
                                    {/* Siguiente turno */}
                                    {propData.shifts.length > 0 && (
                                      <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                                        {(() => {
                                          const now = new Date();
                                          const nextShift = propData.shifts
                                            .filter((s: Shift) => s.startTime && new Date(s.startTime) > now)
                                            .sort((a: Shift, b: Shift) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())[0];
                                          
                                          if (nextShift) {
                                            const startDate = new Date(nextShift.startTime!);
                                            return `Siguiente: ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit"
                                            })}`;
                                          } else {
                                            return "Sin turnos programados";
                                          }
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* DERECHA: Vista Detalle por Horarios - 4 columnas */}
                <div className="col-span-4">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="pb-0 flex-shrink-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {selectedDate 
                          ? `Turnos del ${selectedDate.toLocaleDateString()}`
                          : selectedPropertyId
                            ? `Turnos - ${allProperties.find((p: PropertyWithShifts) => p.property.id === selectedPropertyId)?.property.name || 'Propiedad'}`
                            : `Todos los Turnos (${filteredShifts.length})`
                        }
                      </CardTitle>
                      <div className="text-xs text-muted-foreground">
                        {selectedDate 
                          ? "Propiedades del día seleccionado"
                          : selectedPropertyId
                            ? "Ordenado por fecha (más recientes primero)"
                            : "Último trabajo realizado primero"
                        }
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                      <ScrollArea className="h-full w-full" style={{ maxHeight: 'calc(95vh - 250px)' }}>
                        <div className="space-y-2 p-2 pt-1">
                          {loading && filteredShifts.length === 0 ? (
                            <div className="space-y-2">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between gap-2 rounded border p-2 shadow-sm bg-card"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="h-4 w-4 rounded-full bg-muted/30 animate-pulse mt-0.5" />
                                    <div className="w-full">
                                      <div className="h-3 w-20 rounded bg-muted/30 animate-pulse mb-1"></div>
                                      <div className="h-3 w-32 rounded bg-muted/30 animate-pulse mb-1"></div>
                                      <div className="h-2 w-24 rounded bg-muted/30 animate-pulse"></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="h-6 w-6 rounded bg-muted/30 animate-pulse" />
                                    <div className="h-6 w-6 rounded bg-muted/30 animate-pulse" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : selectedDate ? (
                            // Vista especial: mostrar propiedades del día seleccionado
                            allProperties.filter((propData: PropertyWithShifts) => 
                              propData.shifts.some((shift: Shift) => 
                                shift.startTime && isSameDay(new Date(shift.startTime), selectedDate)
                              )
                            ).length === 0 ? (
                              <div className="text-center text-sm text-muted-foreground py-8">
                                No hay turnos para {selectedDate.toLocaleDateString()}
                              </div>
                            ) : (
                              allProperties.filter((propData: PropertyWithShifts) => 
                                propData.shifts.some((shift: Shift) => 
                                  shift.startTime && isSameDay(new Date(shift.startTime), selectedDate)
                                )
                              ).map((propData: PropertyWithShifts) => (
                                <div
                                  key={propData.property.id}
                                  className="p-2 rounded border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                                  style={{ 
                                    backgroundColor: 'var(--card)',
                                    borderStyle: 'var(--tw-border-style)',
                                    borderWidth: '1px',
                                    borderRadius: 'calc(var(--radius) + 2px)'
                                  }}
                                  onClick={() => {
                                    setSelectedPropertyId(propData.property.id);
                                    setSelectedDate(undefined);
                                  }}
                                >
                                  <div className="flex items-start gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full mt-0.5 flex-shrink-0 border-2 border-white shadow-sm"
                                      style={{ backgroundColor: propData.color }}
                                    />
                                    <div className="flex-1">
                                      <div className="font-semibold text-sm mb-2">
                                        {propData.property.name || propData.property.alias || `Propiedad ${propData.property.id}`}
                                      </div>
                                      
                                      <div className="space-y-2">
                                        {propData.shifts.map((shift: Shift) => (
                                          <div key={shift.id} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                              <Clock className="h-3 w-3" />
                                              <span>
                                                {shift.startTime
                                                  ? new Date(shift.startTime).toLocaleTimeString([], {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    })
                                                  : "—"}{" "}
                                                -{" "}
                                                {shift.endTime
                                                  ? new Date(shift.endTime).toLocaleTimeString([], {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    })
                                                  : "—"}
                                              </span>
                                            </div>
                                            <Badge 
                                              variant="secondary" 
                                              className="text-xs"
                                              style={{ 
                                                backgroundColor: `${STATUS_COLORS[shift.status as keyof typeof STATUS_COLORS]}20`,
                                                color: STATUS_COLORS[shift.status as keyof typeof STATUS_COLORS]
                                              }}
                                            >
                                              {shift.status}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                                        {propData.shifts.length} turno{propData.shifts.length !== 1 ? 's' : ''} • {propData.totalHours}h total
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )
                          ) : filteredShifts.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              {selectedPropertyId
                                ? "No hay turnos para esta propiedad"
                                : "No hay turnos para este guardia"}
                            </div>
                          ) : (
                            // Vista normal: lista de turnos
                            filteredShifts.map((s) => {
                              const propertyLabel = getPropertyLabelForShift(s);
                              const propId = s.property ? Number(s.property) : -1;
                              const propColor = propertyColors[propId] || "#6B7280";
                              
                              return (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between gap-2 rounded border p-2 shadow-sm bg-card hover:shadow-sm transition-shadow"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="w-5 h-5 rounded-full mt-1 flex-shrink-0 border-2 border-white shadow-sm"
                                      style={{ backgroundColor: propColor }}
                                    />
                                    <div>
                                      {!selectedPropertyId && s.startTime && (
                                        <div className="text-xs text-muted-foreground mb-1">
                                          {new Date(s.startTime).toLocaleDateString()}
                                        </div>
                                      )}

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

                                      <div className="text-sm flex items-center gap-2">
                                        <Clock className="h-3 w-3" />
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

                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge 
                                          variant="secondary" 
                                          className="text-xs"
                                          style={{ 
                                            backgroundColor: `${STATUS_COLORS[s.status as keyof typeof STATUS_COLORS]}20`,
                                            color: STATUS_COLORS[s.status as keyof typeof STATUS_COLORS]
                                          }}
                                        >
                                          {s.status}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {s.hoursWorked}h
                                        </span>
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
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="flex-1 min-h-0">
              <div className="text-center text-muted-foreground py-8">
                Vista de timeline en desarrollo...
              </div>
            </TabsContent>
          </Tabs>
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
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>
                      {loading
                        ? TEXT?.common?.loading ?? "Cargando..."
                        : TEXT?.actions?.refresh ?? "Cargar más"}
                    </span>
                  </Button>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="text-sm px-3 py-2"
                  >
                    {TEXT?.actions?.close ?? "Cerrar"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Implementar exportación
                    toast.info("Función de exportar en desarrollo");
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="text-sm px-3 py-2"
                >
                  {TEXT?.actions?.close ?? "Cerrar"}
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
