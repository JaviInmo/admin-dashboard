"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarIcon,
  Loader2,
  Plus,
  RefreshCw,
  Pencil,
  Trash,
  Filter,
  MapPin,
  User,
  Clock,
  BarChart3,
  Download,
  Search,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import CreateShift from "@/components/Shifts/Create/Create";
import ShowShift from "@/components/Shifts/Show/Show";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";
import type { Shift } from "@/components/Shifts/types";
import {
  listShiftsByGuard,
} from "@/lib/services/shifts";
import type { AppProperty } from "@/lib/services/properties";
import type { Service } from "@/components/Services/types";
// import { usePropertiesCache } from "@/hooks/use-properties-cache";
// import { useShiftsCache } from "@/hooks/use-shifts-cache";
// import { useServicesCache } from "@/hooks/use-services-cache";
import { cn } from "@/lib/utils";
import { es as localeEs } from "date-fns/locale";

// Paletas: vivos primero, luego los restantes; se asignan evitando repetir hasta agotar
const VIBRANT_COLORS = [
  "#22C55E", // green
  "#EAB308", // yellow
  "#3B82F6", // blue
  "#EC4899", // pink
  "#EF4444", // red
  // luego variaciones muy distinguibles
  "#F97316", // orange
  "#A855F7", // purple
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#6366F1", // indigo
  "#0EA5E9", // sky
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#10B981", // emerald
];

const FALLBACK_COLORS = [
  "#14B8A6", "#0891B2", "#4F46E5", "#059669", "#65A30D",
  "#155E75", "#0E7490", "#312E81", "#3730A3", "#4D7C0F",
  "#581C87", "#2E1065", "#701A75", "#164E63", "#1E1B4B",
  "#1A2E05", "#365314", "#052E16", "#0C2D12", "#064E3B",
  "#047857", "#0F172A", "#D97706", "#EA580C", "#C2410C",
  "#92400E", "#7C2D12", "#9A3412", "#78350F", "#451A03",
  "#431407", "#7C3AED", "#A21CAF", "#BE185D", "#DC2626",
  "#B91C1C", "#991B1B", "#7F1D1D", "#450A0A",
];

// Estados de turnos con colores
const STATUS_COLORS = {
  scheduled: "#3B82F6", // blue
  "in-progress": "#EAB308", // yellow
  completed: "#22C55E", // green
  cancelled: "#EF4444", // red
  pending: "#F97316", // orange
};

function assignColorsForIds(
  existing: Record<number, string>,
  ids: number[],
  vibrant: string[],
  fallback: string[],
): Record<number, string> {
  const used = new Set(Object.values(existing));
  const result = { ...existing };

  ids.forEach((id) => {
    if (result[id]) return; // already assigned

    // Try vibrant first, then fallback
    let color = vibrant.find((c) => !used.has(c));
    if (!color) {
      color = fallback.find((c) => !used.has(c));
    }
    if (!color) {
      // Fallback to random if all used
      color = vibrant[Math.floor(Math.random() * vibrant.length)];
    }

    result[id] = color;
    used.add(color);
  });

  return result;
}

type PropertyWithShifts = {
  property: AppProperty;
  shifts: Shift[];
  totalHours: number;
  color: string;
};

type Props = {
  guardId: number;
  guardName?: string;
  open: boolean;
  onClose: () => void;
};

export default function GuardShiftsModalImproved({ guardId, guardName, open, onClose }: Props) {
  const { TEXT } = useI18n();

  // Estados principales
  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = React.useState<number | null>(null);
  const [propertySearchQuery, setPropertySearchQuery] = React.useState<string>("");
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openShowId, setOpenShowId] = React.useState<number | null>(null);
  const [openEditId, setOpenEditId] = React.useState<number | null>(null);
  const [openDeleteId, setOpenDeleteId] = React.useState<number | null>(null);

  // Estados para creación de turnos
  const [createShiftPropertyId, setCreateShiftPropertyId] = React.useState<number | null>(null);
  const [createShiftPreselectedProperty, setCreateShiftPreselectedProperty] = React.useState<AppProperty | null>(null);
  const [createShiftPreselectedService, setCreateShiftPreselectedService] = React.useState<Service | null>(null);

  // Estados para drag & drop
  const [isDragOverTimeline, setIsDragOverTimeline] = React.useState(false);

  // Caches - simplificados para esta implementación básica
  // const { fetchWithCache: fetchPropertyWithCache, getFromCache: getPropertyFromCache } = usePropertiesCache();
  // const { fetchWithCache: fetchShiftsWithCache, getFromCache: getShiftsFromCache } = useShiftsCache();
  // const { fetchWithCache: fetchServicesWithCache, getFromCache: getServicesFromCache } = useServicesCache();

  // Cargar turnos del guardia
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Función para cargar turnos
  const loadShifts = React.useCallback(async () => {
    if (!open) return;

    setLoading(true);
    try {
      const data = await listShiftsByGuard(guardId, 1, 100);
      setShifts(data.items);
    } catch (error) {
      console.error("Error loading shifts:", error);
      toast.error("Error al cargar los turnos");
    } finally {
      setLoading(false);
    }
  }, [guardId, open]);

  // Cargar turnos cuando se abre el modal
  React.useEffect(() => {
    if (open) {
      loadShifts();
    }
  }, [open, loadShifts]);

  // Propiedades disponibles - extraídas de los turnos
  const allProperties = React.useMemo(() => {
    const propertyMap = new Map<number, AppProperty>();
    
    shifts.forEach(shift => {
      if (shift.property && shift.propertyDetails) {
        const propId = Number(shift.property);
        if (!propertyMap.has(propId)) {
          propertyMap.set(propId, {
            id: propId,
            name: shift.propertyDetails.name || `Property ${propId}`,
            alias: shift.propertyDetails.alias || "",
            address: shift.propertyDetails.address || "",
            ownerId: 0,
            description: null,
            contractStartDate: null,
            createdAt: null,
            updatedAt: null,
          });
        }
      }
    });
    
    return Array.from(propertyMap.values());
  }, [shifts]);

  // Servicios disponibles - simplificado
  const allServices = React.useMemo(() => {
    const serviceMap = new Map<number, Service>();
    
    shifts.forEach(shift => {
      if (shift.service && shift.serviceDetails) {
        const svcId = Number(shift.service);
        if (!serviceMap.has(svcId)) {
          serviceMap.set(svcId, {
            id: svcId,
            name: shift.serviceDetails.name || `Service ${svcId}`,
            guard: guardId,
            assignedProperty: shift.property ? Number(shift.property) : null,
            propertyName: shift.propertyDetails?.name || "",
            rate: "",
            monthlyBudget: "",
            totalHours: "",
            scheduled_total_hours: "",
            contractStartDate: "",
            startDate: "",
            endDate: "",
            startTime: "",
            endTime: "",
            schedule: [],
            recurrent: false,
            isActive: true,
            createdAt: "",
            updatedAt: "",
            description: "",
            guardName: "",
          });
        }
      }
    });
    
    return Array.from(serviceMap.values());
  }, [shifts, guardId]);

  // Asignar colores a propiedades
  const propertyColors = React.useMemo(() => {
    const propertyIds = allProperties.map(p => p.id);
    return assignColorsForIds({}, propertyIds, VIBRANT_COLORS, FALLBACK_COLORS);
  }, [allProperties]);

  // Filtrar propiedades por búsqueda
  const filteredProperties = React.useMemo(() => {
    if (!propertySearchQuery.trim()) return allProperties;

    const query = propertySearchQuery.toLowerCase();
    return allProperties.filter(p =>
      p.name && (p.name.toLowerCase().includes(query) ||
      (p.alias && p.alias.toLowerCase().includes(query)) ||
      (p.address && p.address.toLowerCase().includes(query)))
    );
  }, [allProperties, propertySearchQuery]);

  // Propiedades con turnos
  const propertiesWithShifts = React.useMemo((): PropertyWithShifts[] => {
    const result: PropertyWithShifts[] = [];

    filteredProperties.forEach(property => {
      const propertyShifts = shifts.filter(s => s.property === property.id);
      if (propertyShifts.length > 0) {
        const totalHours = propertyShifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
        result.push({
          property,
          shifts: propertyShifts,
          totalHours,
          color: propertyColors[property.id] || VIBRANT_COLORS[0],
        });
      }
    });

    return result.sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredProperties, shifts, propertyColors]);

  // Turnos filtrados
  const filteredShifts = React.useMemo(() => {
    let result = shifts;

    // Filtrar por propiedad seleccionada
    if (selectedPropertyId !== null) {
      result = result.filter(s => s.property === selectedPropertyId);
    }

    // Filtrar por servicio seleccionado
    if (selectedServiceId !== null) {
      result = result.filter(s => s.service === selectedServiceId);
    }

    // Filtrar por fecha seleccionada
    if (selectedDate) {
      result = result.filter(s => {
        const shiftDate = s.plannedStartTime || s.startTime;
        if (!shiftDate) return false;
        const date = new Date(shiftDate);
        return date.toDateString() === selectedDate.toDateString();
      });
    }

    return result.sort((a, b) => {
      const aTime = new Date(a.plannedStartTime || a.startTime || 0).getTime();
      const bTime = new Date(b.plannedStartTime || b.startTime || 0).getTime();
      return bTime - aTime; // Más recientes primero
    });
  }, [shifts, selectedPropertyId, selectedServiceId, selectedDate]);

  // Estadísticas
  const statistics = React.useMemo(() => {
    const total = filteredShifts.length;
    const totalHours = filteredShifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    return { total, totalHours };
  }, [filteredShifts]);

  // Fechas disponibles (con turnos)
  const allowedDates = React.useMemo(() => {
    const dates = new Set<string>();
    shifts.forEach(s => {
      const date = s.plannedStartTime || s.startTime;
      if (date) {
        dates.add(new Date(date).toDateString());
      }
    });
    return Array.from(dates).map(d => new Date(d));
  }, [shifts]);

  // Fechas deshabilitadas (sin turnos)
  const disabledDays = React.useCallback((date: Date) => {
    return !allowedDates.some(allowed => allowed.toDateString() === date.toDateString());
  }, [allowedDates]);

  // Rango de fechas para el calendario
  const fromMonth = React.useMemo(() => {
    if (allowedDates.length === 0) return new Date();
    return new Date(Math.min(...allowedDates.map(d => d.getTime())));
  }, [allowedDates]);

  const toMonth = React.useMemo(() => {
    if (allowedDates.length === 0) return new Date();
    return new Date(Math.max(...allowedDates.map(d => d.getTime())));
  }, [allowedDates]);

  // Funciones de utilidad
  const formatTime12h = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getPropertyLabelForShift = (shift: Shift) => {
    if (!shift.property) return null;
    const property = allProperties.find(p => p.id === shift.property);
    return property ? property.name : null;
  };

  // Handlers
  const handleCreated = React.useCallback(async (shift: Shift) => {
    await loadShifts();
    // Seleccionar la fecha del turno creado
    const shiftDate = shift.plannedStartTime || shift.startTime;
    if (shiftDate) {
      setSelectedDate(new Date(shiftDate));
    }
  }, [loadShifts]);

  const handleUpdated = React.useCallback(async () => {
    await loadShifts();
  }, [loadShifts]);

  const handleDeleted = React.useCallback(async () => {
    await loadShifts();
  }, [loadShifts]);

  const refresh = React.useCallback(async () => {
    await loadShifts();
  }, [loadShifts]);

  // Funciones para drag & drop (simplificadas)
  const handleTimelineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverTimeline(true);
  };

  const handleTimelineDragLeave = () => {
    setIsDragOverTimeline(false);
  };

  const handleTimelineDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverTimeline(false);
    // Implementar lógica de drop aquí
    toast.info("Funcionalidad de drag & drop en desarrollo");
  };

  // Timeline ref
  const timelineRef = React.useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-7xl h-[95vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Turnos de {guardName || `Guardia ${guardId}`}
            </DialogTitle>

            <div className="flex items-center gap-2">
              {/* Selector de servicios */}
              {allServices.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Servicio:</span>
                  <Select
                    value={selectedServiceId?.toString() || "all"}
                    onValueChange={(value) => {
                      setSelectedServiceId(value === "all" ? null : Number(value));
                    }}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los servicios</SelectItem>
                      {allServices.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{service.name}</span>
                            {service.startTime && service.endTime && (
                              <span className="text-muted-foreground text-xs">
                                ({formatTime12h(service.startTime)} - {formatTime12h(service.endTime)})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <span className="text-sm bg-muted/50 px-3 py-1 rounded">
                <BarChart3 className="h-4 w-4 inline mr-1" />
                {statistics.total} turnos • {statistics.totalHours.toFixed(1)}h total
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-1 flex-shrink-0">
            {/* Botón para limpiar filtro de servicio */}
            {selectedServiceId !== null && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedServiceId(null)}
                className="h-8 text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Limpiar filtro
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                toast.info("Función de exportar en desarrollo");
              }}
              className="h-8 w-8 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setCreateShiftPropertyId(null);
                setCreateShiftPreselectedProperty(null);
                if (selectedServiceId !== null) {
                  const svc = allServices.find(s => s.id === selectedServiceId) || null;
                  setCreateShiftPreselectedService(svc);
                } else {
                  setCreateShiftPreselectedService(null);
                }
                setOpenCreate(true);
              }}
              className="h-8"
              disabled={loading}
            >
              <Plus className="h-3 w-3 mr-1" />
              {!loading ? (TEXT?.shifts?.create?.title ?? "Crear") : "Cargando..."}
            </Button>
          </div>
        </DialogHeader>

        {/* Área principal */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            className="grid grid-cols-12 gap-6 h-full overflow-hidden"
            style={{
              gap: 'calc(var(--spacing) * 1)'
            }}
          >
            {/* IZQUIERDA: Calendario - 4 columnas */}
            <div className="col-span-4">
              <Card className="h-full flex flex-col gap-0 py-2">
                <CardContent className="flex-1 min-h-0 p-0">
                  <div className="h-full w-full flex flex-col">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={disabledDays}
                      locale={localeEs}
                      fromMonth={fromMonth}
                      toMonth={toMonth}
                      className="w-full"
                      modifiers={{
                        hasShifts: allowedDates,
                      }}
                      modifiersStyles={{
                        hasShifts: {
                          fontWeight: "bold",
                        }
                      }}
                      modifiersClassNames={{
                        disabled: "cursor-not-allowed opacity-50 hover:bg-muted/30"
                      }}
                      components={{
                        DayButton: (props: any) => {
                          const dateKey = props.day.date.toLocaleDateString();
                          const dayShifts = shifts.filter(s => {
                            const shiftDate = s.plannedStartTime || s.startTime;
                            return shiftDate && new Date(shiftDate).toDateString() === dateKey;
                          });

                          return (
                            <button
                              {...props}
                              className={cn(
                                "relative aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal text-sm p-1 transition-all duration-200",
                                "hover:bg-accent hover:text-accent-foreground rounded-md",
                                props.modifiers?.selected && "bg-primary text-primary-foreground ring-2 ring-primary/20",
                                props.modifiers?.today && !props.modifiers?.selected && "bg-accent text-accent-foreground font-bold ring-1 ring-accent",
                                props.modifiers?.hasShifts && !props.modifiers?.selected && "shadow-sm bg-blue-50/60 border border-blue-100/80",
                                props.className
                              )}
                            >
                              <div className="relative w-full h-full flex flex-col items-center justify-center">
                                {/* Número del día */}
                                <span className={cn(
                                  "text-sm",
                                  dayShifts.length > 0 && "font-semibold"
                                )}>
                                  {props.day.date.getDate()}
                                </span>

                                {/* Indicadores de turnos */}
                                {dayShifts.length > 0 && (
                                  <div className="absolute bottom-0.5 flex justify-center gap-0.5 flex-wrap max-w-full">
                                    {dayShifts.slice(0, Math.min(dayShifts.length, 3)).map((shift, idx) => {
                                      const propertyId = shift.property ? Number(shift.property) : -1;
                                      const color = propertyColors[propertyId] || VIBRANT_COLORS[0];
                                      return (
                                        <div
                                          key={`${shift.id}-${idx}`}
                                          className="w-1.5 h-1.5 rounded-full border border-white/30"
                                          style={{ backgroundColor: color }}
                                          title={`Turno en propiedad ${propertyId}`}
                                        />
                                      );
                                    })}
                                    {dayShifts.length > 3 && (
                                      <div
                                        className="w-1.5 h-1.5 rounded-full bg-gray-500 border border-white/30 flex items-center justify-center"
                                        title={`+${dayShifts.length - 3} más turnos`}
                                      >
                                        <span className="text-[6px] text-white leading-none font-bold">+</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        }
                      }}
                      numberOfMonths={1}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CENTRO: Lista de Propiedades - 4 columnas */}
            <div className="col-span-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Propiedades ({propertiesWithShifts.length})
                    </CardTitle>

                    <div className="flex items-center gap-2">
                      {/* Botón de limpiar filtros */}
                      {(selectedPropertyId || propertySearchQuery.trim()) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPropertyId(null);
                            setPropertySearchQuery("");
                          }}
                          className="h-6 px-2 text-xs"
                        >
                          <Filter className="h-3 w-3 mr-1" />
                          Limpiar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                  {/* Campo de búsqueda */}
                  <div className="px-3 pb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar propiedad..."
                        value={propertySearchQuery}
                        onChange={(e) => setPropertySearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                      {propertySearchQuery && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPropertySearchQuery("")}
                          className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-muted"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Lista de propiedades */}
                  <ScrollArea className="h-[calc(95vh-360px)] w-full">
                    <div className="space-y-2 px-3 pb-2">
                      {loading ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando propiedades...
                          </div>
                        </div>
                      ) : propertiesWithShifts.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          {propertySearchQuery.trim() ?
                            "No se encontraron propiedades" :
                            "No hay propiedades con turnos para este guardia"
                          }
                        </div>
                      ) : (
                        propertiesWithShifts.map((propertyData) => (
                          <div
                            key={propertyData.property.id}
                            className={cn(
                              "p-2 rounded border transition-all hover:shadow-sm cursor-pointer",
                              selectedPropertyId === propertyData.property.id
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-transparent bg-muted/50 hover:bg-muted"
                            )}
                            onClick={() => {
                              setSelectedPropertyId(
                                selectedPropertyId === propertyData.property.id
                                  ? null
                                  : propertyData.property.id
                              );
                              setSelectedDate(undefined);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 border-2 border-white shadow-sm"
                                style={{ backgroundColor: propertyData.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="font-medium text-xs truncate">
                                    {propertyData.property.name}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {propertyData.shifts.length}
                                  </span>
                                  {propertyData.totalHours > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {propertyData.totalHours.toFixed(1)}h
                                    </span>
                                  )}
                                </div>

                                {/* Último turno */}
                                {propertyData.shifts.length > 0 && (
                                  <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                                    {(() => {
                                      const lastShift = propertyData.shifts
                                        .sort((a, b) => {
                                          const aTime = new Date(a.plannedStartTime || a.startTime || 0).getTime();
                                          const bTime = new Date(b.plannedStartTime || b.startTime || 0).getTime();
                                          return bTime - aTime;
                                        })[0];

                                      if (lastShift) {
                                        const shiftTime = lastShift.plannedStartTime || lastShift.startTime;
                                        const startDate = new Date(shiftTime!);
                                        return `Último: ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString('en-US', {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true
                                        })}`;
                                      } else {
                                        return "Sin turnos";
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

            {/* DERECHA: Vista Detalle - 4 columnas */}
            <div className="col-span-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-0 flex-shrink-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedDate
                      ? `Turnos del ${selectedDate.toLocaleDateString()}`
                      : selectedPropertyId
                        ? `Turnos - ${propertiesWithShifts.find((p: PropertyWithShifts) => p.property.id === selectedPropertyId)?.property.name || 'Propiedad'}`
                        : `Todos los Turnos (${filteredShifts.length})`
                    }
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {selectedDate
                      ? "Turnos del día seleccionado"
                      : selectedPropertyId
                        ? "Ordenado por fecha (más recientes primero)"
                        : "Último trabajo realizado primero"
                    }
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                  {selectedDate ? (
                    <div className="h-full w-full p-2">
                      <div
                        ref={timelineRef}
                        className="relative w-full h-full overflow-hidden bg-transparent"
                        onDragOver={handleTimelineDragOver}
                        onDragEnter={handleTimelineDragOver}
                        onDragLeave={handleTimelineDragLeave}
                        onDrop={handleTimelineDrop}
                      >
                        {/* Fondos alternos por hora */}
                        {Array.from({ length: 24 }, (_, h) => {
                          const top = (h / 24) * 100;
                          const height = (1 / 24) * 100;
                          const isEven = h % 2 === 0;
                          return (
                            <div
                              key={`bg-${h}`}
                              className="absolute left-0 right-0 border-t border-muted/30 z-0 pointer-events-none"
                              style={{
                                top: `${top}%`,
                                height: `${height}%`,
                                backgroundColor: isEven ? '#F3F4F6' : '#EFF6FF',
                              }}
                            />
                          );
                        })}

                        {/* Drop highlight overlay */}
                        {isDragOverTimeline && (
                          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
                            <div className="absolute inset-1 rounded-md border-2 border-dashed border-primary/60 bg-primary/5" />
                            <div className="relative z-50 text-xs px-2 py-1 rounded bg-primary text-primary-foreground shadow">
                              Suelta para crear turno
                            </div>
                          </div>
                        )}

                        {/* Líneas horarias */}
                        {Array.from({ length: 25 }, (_, h) => {
                          const top = (h / 24) * 100;
                          const showLabel = h % 2 === 0;
                          return (
                            <div key={h}>
                              <div className="absolute left-0 right-0 border-t border-muted/30 z-30 pointer-events-none" style={{ top: `${top}%` }} />
                              {showLabel && (
                                <div
                                  className="absolute left-1 text-[10px] text-muted-foreground bg-background/80 px-1 rounded z-30 pointer-events-none"
                                  style={{ top: `${top}%` }}
                                >
                                  {h.toString().padStart(2, '0')}:00
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Franja del servicio seleccionado */}
                        {selectedServiceId !== null && (() => {
                          const selectedService = allServices.find(s => s.id === selectedServiceId);
                          if (!selectedService || !selectedService.startTime || !selectedService.endTime) return null;

                          const parseTime = (timeStr: string) => {
                            const parts = timeStr.split(':');
                            const hours = parseInt(parts[0], 10) || 0;
                            const minutes = parseInt(parts[1], 10) || 0;
                            return { hours, minutes };
                          };

                          const startTimeObj = parseTime(selectedService.startTime);
                          const endTimeObj = parseTime(selectedService.endTime);

                          const startMinutes = startTimeObj.hours * 60 + startTimeObj.minutes;
                          let endMinutes = endTimeObj.hours * 60 + endTimeObj.minutes;

                          if (endMinutes <= startMinutes) {
                            endMinutes += 24 * 60;
                          }

                          const durationMinutes = endMinutes - startMinutes;
                          const topPct = (startMinutes / (24 * 60)) * 100;
                          const heightPct = (durationMinutes / (24 * 60)) * 100;

                          return (
                            <div
                              key="service-schedule"
                              className="absolute left-2 right-2 rounded-lg z-20 border-l-4 border-orange-500 shadow-sm"
                              style={{
                                top: `${topPct}%`,
                                height: `${Math.max(heightPct, 2)}%`,
                                backgroundColor: "rgba(249, 115, 22, 0.15)",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                              }}
                              title={`Horario del servicio: ${selectedService.name} (${formatTime12h(selectedService.startTime)} - ${formatTime12h(selectedService.endTime)})`}
                            >
                              <div className="absolute left-1 top-1 text-[10px] text-orange-800 bg-orange-100/95 px-1.5 py-0.5 rounded-sm font-medium shadow-sm">
                                📋 {selectedService.name}
                              </div>
                              <div className="absolute right-1 top-1 text-[9px] text-orange-700 bg-orange-50/90 px-1 py-0.5 rounded-sm">
                                {formatTime12h(selectedService.startTime)} - {formatTime12h(selectedService.endTime)}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Bloques de turnos */}
                        {(() => {
                          const sod = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
                          const eod = sod + 24 * 60 * 60 * 1000;

                          type Item = {
                            shift: Shift;
                            propertyId: number;
                            propertyName: string;
                            color: string;
                            startMs: number;
                            endMs: number;
                            clampedStart: number;
                            clampedEnd: number;
                            topPct: number;
                            heightPct: number;
                          };

                          const items: Item[] = shifts
                            .filter((shift) => {
                              const startTimeStr = shift.plannedStartTime || shift.startTime;
                              if (!startTimeStr) return false;

                              const st = new Date(startTimeStr).getTime();
                              const endTimeStr = shift.plannedEndTime || shift.endTime;
                              const et = endTimeStr ? new Date(endTimeStr).getTime() : st + 60 * 60 * 1000;

                              const overlapsWithDay = st < eod && et > sod;
                              if (!overlapsWithDay) return false;

                              if (selectedServiceId !== null) {
                                return shift.service === selectedServiceId;
                              }

                              return true;
                            })
                            .map((shift) => {
                              const propertyId = shift.property ? Number(shift.property) : -1;
                              const property = allProperties.find(p => p.id === propertyId);
                              const propertyName = property?.name || (propertyId !== -1 ? `Propiedad ${propertyId}` : "Sin propiedad");
                              const color = propertyColors[propertyId] || VIBRANT_COLORS[0];

                              const startTimeStr = shift.plannedStartTime || shift.startTime;
                              const endTimeStr = shift.plannedEndTime || shift.endTime;
                              const startMs = startTimeStr ? new Date(startTimeStr).getTime() : sod;
                              const endMs = endTimeStr ? new Date(endTimeStr).getTime() : Math.min(startMs + 60 * 60 * 1000, eod);

                              const clampedStart = Math.max(startMs, sod);
                              const clampedEnd = Math.min(endMs, eod);
                              const minutesFromStart = Math.max(0, (clampedStart - sod) / 60000);
                              const durationMinutes = Math.max(15, (clampedEnd - clampedStart) / 60000);
                              const topPct = (minutesFromStart / (24 * 60)) * 100;
                              const heightPct = (durationMinutes / (24 * 60)) * 100;

                              return {
                                shift,
                                propertyId,
                                propertyName,
                                color,
                                startMs,
                                endMs,
                                clampedStart,
                                clampedEnd,
                                topPct,
                                heightPct,
                              };
                            })
                            .sort((a, b) => a.clampedStart - b.clampedStart);

                          return items.map((it) => (
                            <div
                              key={it.shift.id}
                              className="absolute left-10 right-2 z-20"
                              style={{ top: `${it.topPct}%`, height: `${it.heightPct}%` }}
                            >
                              <div
                                className="absolute inset-y-0 shadow-sm text-white text-[10px] leading-tight p-2 select-none cursor-pointer hover:ring-2 hover:ring-white/20 rounded-md"
                                style={{
                                  left: '0px',
                                  width: '100%',
                                  backgroundColor: it.color + "E6",
                                  backdropFilter: "blur(0.5px)",
                                }}
                                title={`${it.propertyName}\n${it.startMs ? new Date(it.startMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''} - ${it.endMs ? new Date(it.endMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}`}
                                onClick={() => setOpenEditId(it.shift.id)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold truncate">{it.propertyName}</span>
                                  <div className="flex flex-col items-center gap-0.5 ml-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                                      title="Editar"
                                      onClick={(e) => { e.stopPropagation(); setOpenEditId(it.shift.id); }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-white/90 hover:bg-white/20"
                                      title="Eliminar"
                                      onClick={(e) => { e.stopPropagation(); setOpenDeleteId(it.shift.id); }}
                                    >
                                      <Trash className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-[9px] mt-1">
                                  {it.startMs ? new Date(it.startMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "--:--"}
                                  {" "}–{" "}
                                  {it.endMs ? new Date(it.endMs).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "--:--"}
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="h-[calc(95vh-280px)] w-full">
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
                        ) : filteredShifts.length === 0 ? (
                          <div className="text-center text-sm text-muted-foreground py-8">
                            {selectedPropertyId
                              ? "No hay turnos para esta propiedad"
                              : "No hay turnos para este guardia"}
                          </div>
                        ) : (
                          filteredShifts.map((s) => {
                            const propertyLabel = getPropertyLabelForShift(s);
                            const propId = s.property ? Number(s.property) : -1;
                            const propColor = propertyColors[propId] || VIBRANT_COLORS[0];

                            return (
                              <div
                                key={s.id}
                                className="flex items-center justify-between gap-2 rounded border p-2 shadow-sm transition-shadow bg-card hover:shadow-sm"
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="w-5 h-5 rounded-full mt-1 flex-shrink-0 border-2 border-white shadow-sm"
                                    style={{ backgroundColor: propColor }}
                                  />
                                  <div>
                                    {!selectedPropertyId && (s.plannedStartTime || s.startTime) && (
                                      <div className="text-xs text-muted-foreground mb-1">
                                        {new Date((s.plannedStartTime || s.startTime)!).toLocaleDateString()}
                                      </div>
                                    )}

                                    <div className="text-sm font-semibold">
                                      {propertyLabel !== null ? (
                                        propertyLabel
                                      ) : s.property != null ? (
                                        `Property ID: ${s.property}`
                                      ) : (
                                        "-"
                                      )}
                                    </div>

                                    <div className="text-sm flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      {(s.isArmed || s.weapon) && (
                                        <Shield className="h-3 w-3 text-blue-600" />
                                      )}
                                      {(s.plannedStartTime || s.startTime)
                                        ? new Date((s.plannedStartTime || s.startTime)!).toLocaleTimeString('en-US', {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true
                                          })
                                        : "—"}{" "}
                                      —{" "}
                                      {(s.plannedEndTime || s.endTime)
                                        ? new Date((s.plannedEndTime || s.endTime)!).toLocaleTimeString('en-US', {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true
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
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>

      <CreateShift
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          setCreateShiftPropertyId(null);
          setCreateShiftPreselectedProperty(null);
          setCreateShiftPreselectedService(null);
        }}
        selectedDate={selectedDate}
        propertyId={createShiftPropertyId}
        preselectedProperty={createShiftPreselectedProperty}
        preselectedService={createShiftPreselectedService}
        preloadedProperties={allProperties}
        preloadedGuards={[]} // No necesitamos preloaded guards ya que estamos en contexto de guardia
        guardId={guardId} // Guardia preseleccionada
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
