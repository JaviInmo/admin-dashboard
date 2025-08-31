"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Search,
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
import { listShiftsByGuard } from "@/lib/services/shifts";
import { getProperty } from "@/lib/services/properties";
import { getGuard } from "@/lib/services/guard";
import type { AppProperty } from "@/lib/services/properties";
import { cn } from "@/lib/utils";

// Colores para propiedades - paleta de 50 colores únicos
const PROPERTY_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", // 1-5: azul, rojo, verde, ámbar, violeta
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16", // 6-10: rosa, teal, naranja, índigo, lima
  "#DC2626", "#059669", "#D97706", "#7C3AED", "#BE185D", // 11-15: rojo oscuro, esmeralda oscuro, ámbar oscuro, violeta oscuro, rosa oscuro
  "#0891B2", "#EA580C", "#4F46E5", "#65A30D", "#B91C1C", // 16-20: cian, naranja oscuro, índigo oscuro, lima oscuro, rojo muy oscuro
  "#047857", "#92400E", "#5B21B6", "#A21CAF", "#0E7490", // 21-25: esmeralda muy oscuro, ámbar muy oscuro, violeta muy oscuro, rosa muy oscuro, cian oscuro
  "#C2410C", "#3730A3", "#4D7C0F", "#991B1B", "#064E3B", // 26-30: naranja muy oscuro, índigo muy oscuro, lima muy oscuro, rojo extremo, esmeralda extremo
  "#78350F", "#581C87", "#86198F", "#155E75", "#9A3412", // 31-35: ámbar extremo, violeta extremo, rosa extremo, cian muy oscuro, naranja extremo
  "#312E81", "#365314", "#7F1D1D", "#052E16", "#451A03", // 36-40: índigo extremo, lima extremo, rojo final, esmeralda final, ámbar final
  "#2E1065", "#701A75", "#164E63", "#7C2D12", "#1E1B4B", // 41-45: violeta final, rosa final, cian final, naranja final, índigo final
  "#1A2E05", "#450A0A", "#0C2D12", "#431407", "#0F172A"  // 46-50: lima final, rojo absoluto, esmeralda absoluto, ámbar absoluto, slate muy oscuro
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
  const [loading, setLoading] = React.useState<boolean>(false);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | null>(null);

  // Cache de propiedades { [id]: AppProperty | null }
  const [propertyMap, setPropertyMap] = React.useState<
    Record<number, AppProperty | null>
  >({});
  const [propertyColors, setPropertyColors] = React.useState<Record<number, string>>({});
  const [loadingProps, setLoadingProps] = React.useState<boolean>(false);
  
  // Estados para filtrado de propiedades
  const [propertyTimeFilter, setPropertyTimeFilter] = React.useState<string>("all");
  const [propertySearchQuery, setPropertySearchQuery] = React.useState<string>("");
  
  // Cache de todas las propiedades para mejorar rendimiento
  const [allPropertiesCache, setAllPropertiesCache] = React.useState<AppProperty[]>([]);
  const [propertiesCacheLoaded, setPropertiesCacheLoaded] = React.useState<boolean>(false);
  
  // Cache del guardia actual para evitar llamadas repetidas
  const [currentGuardCache, setCurrentGuardCache] = React.useState<any | null>(null);
  const [guardCacheLoaded, setGuardCacheLoaded] = React.useState<boolean>(false);

  // Estados para manejo de solapamientos
  const [overlapDays, setOverlapDays] = React.useState<Set<string>>(new Set());
  const [overlapAlert, setOverlapAlert] = React.useState<string>("");
  const [overlapShifts, setOverlapShifts] = React.useState<Set<number>>(new Set());
  const [overlapProperties, setOverlapProperties] = React.useState<Set<number>>(new Set());

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

  // Detectar días con solapamientos
  const overlapDetection = React.useMemo(() => {
    const overlaps = new Set<string>();
    const overlapMessages: string[] = [];
    const overlappingShifts = new Set<number>();
    const overlappingProperties = new Set<number>();

    // Función para verificar solapamiento entre dos turnos
    const checkTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
      const startDate1 = new Date(start1);
      const endDate1 = new Date(end1);
      const startDate2 = new Date(start2);
      const endDate2 = new Date(end2);
      return startDate1 < endDate2 && startDate2 < endDate1;
    };

    // Verificar solapamientos día por día
    Object.values(processedData).forEach((dayData) => {
      const dayShifts = dayData.shifts;
      if (dayShifts.length < 2) return; // No puede haber solapamiento con menos de 2 turnos

      for (let i = 0; i < dayShifts.length; i++) {
        for (let j = i + 1; j < dayShifts.length; j++) {
          const shift1 = dayShifts[i];
          const shift2 = dayShifts[j];

          if (shift1.startTime && shift1.endTime && shift2.startTime && shift2.endTime) {
            if (checkTimeOverlap(shift1.startTime, shift1.endTime, shift2.startTime, shift2.endTime)) {
              const dateKey = dayData.date.toLocaleDateString();
              overlaps.add(dateKey);
              
              // Marcar turnos específicos con solapamiento
              overlappingShifts.add(shift1.id);
              overlappingShifts.add(shift2.id);
              
              // Marcar propiedades afectadas
              if (shift1.property) overlappingProperties.add(Number(shift1.property));
              if (shift2.property) overlappingProperties.add(Number(shift2.property));
              
              if (!overlapMessages.some(msg => msg.includes(dateKey))) {
                overlapMessages.push(`${dateKey}`);
              }
            }
          }
        }
      }
    });

    return { 
      overlaps, 
      overlappingShifts,
      overlappingProperties,
      message: overlapMessages.length > 0 ? `Solapamientos detectados en: ${overlapMessages.join(', ')}` : '' 
    };
  }, [processedData]);

  // Actualizar estados de solapamiento
  React.useEffect(() => {
    setOverlapDays(overlapDetection.overlaps);
    setOverlapAlert(overlapDetection.message);
    setOverlapShifts(overlapDetection.overlappingShifts);
    setOverlapProperties(overlapDetection.overlappingProperties);
  }, [overlapDetection]);

  // Mapa de fecha -> propiedades con turnos para mostrar círculos
  const datePropertyMap = React.useMemo(() => {
    const map: Record<string, Array<{propertyId: number, color: string}>> = {};
    
    shifts.forEach(shift => {
      if (!shift.startTime) return;
      const dateKey = new Date(shift.startTime).toDateString();
      const propertyId = Number(shift.property);
      const color = propertyColors[propertyId] || PROPERTY_COLORS[propertyId % PROPERTY_COLORS.length];
      
      if (!map[dateKey]) map[dateKey] = [];
      
      // Evitar duplicados de la misma propiedad
      if (!map[dateKey].find(p => p.propertyId === propertyId)) {
        map[dateKey].push({ propertyId, color });
      }
    });
    
    return map;
  }, [shifts, propertyColors]);

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

  // Propiedades filtradas por búsqueda y tiempo
  const filteredProperties = React.useMemo(() => {
    let result = allProperties;
    
    // Filtro por búsqueda de texto
    if (propertySearchQuery.trim()) {
      const query = propertySearchQuery.toLowerCase();
      result = result.filter(prop => 
        prop.property.name?.toLowerCase().includes(query) ||
        prop.property.alias?.toLowerCase().includes(query) ||
        prop.property.address?.toLowerCase().includes(query)
      );
    }
    
    // Filtro temporal
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (propertyTimeFilter) {
      case 'future':
        result = result.filter(prop => 
          prop.shifts.some(shift => 
            shift.startTime && new Date(shift.startTime) > now
          )
        );
        break;
      case 'current':
        result = result.filter(prop => 
          prop.shifts.some(shift => 
            shift.startTime && isSameDay(new Date(shift.startTime), today)
          )
        );
        break;
      case 'past':
        result = result.filter(prop => 
          prop.shifts.length > 0 && prop.shifts.every(shift => 
            shift.startTime && new Date(shift.startTime) < today
          )
        );
        break;
      case 'no-shifts':
        result = result.filter(prop => prop.shifts.length === 0);
        break;
      case 'all':
      default:
        // No filtrar, mostrar todas
        break;
    }
    
    return result;
  }, [allProperties, propertySearchQuery, propertyTimeFilter]);

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

  // Precargar cache de propiedades al abrir el modal (solo las usadas por este guardia)
  React.useEffect(() => {
    if (!open || propertiesCacheLoaded) return;
    
    let mounted = true;
    const loadGuardProperties = async () => {
      try {
        console.log("Precargando propiedades específicas del guardia...");
        
        // Primero obtener los turnos del guardia para ver qué propiedades usa
        const shiftsResponse = await listShiftsByGuard(guardId, 1, 500); // Obtener suficientes turnos para ver todas las propiedades
        const shiftsData = Array.isArray(shiftsResponse) ? shiftsResponse : (shiftsResponse as any)?.results || [];
        
        // Extraer IDs únicos de propiedades usadas por este guardia
        const propertyIds = Array.from(
          new Set(
            shiftsData
              .map((shift: any) => shift.property || shift.property_id)
              .filter((id: any) => id != null)
              .map((id: any) => Number(id))
          )
        ).filter((id) => !Number.isNaN(id)) as number[];
        
        if (!mounted) return;
        
        if (propertyIds.length === 0) {
          console.log("✅ Guardia sin propiedades asignadas");
          setAllPropertiesCache([]);
          setPropertiesCacheLoaded(true);
          return;
        }
        
        // Cargar solo las propiedades específicas que usa este guardia
        console.log(`Cargando ${propertyIds.length} propiedades específicas:`, propertyIds);
        const propertyPromises = propertyIds.map((id: number) => getProperty(id).catch(err => {
          console.warn(`Error cargando propiedad ${id}:`, err);
          return null;
        }));
        
        const properties = (await Promise.all(propertyPromises)).filter(p => p !== null);
        
        if (!mounted) return;
          
        setAllPropertiesCache(properties);
        setPropertiesCacheLoaded(true);
        console.log(`✅ Precargadas ${properties.length} propiedades específicas del guardia en cache`);
      } catch (error) {
        console.error("❌ Error precargando propiedades del guardia:", error);
      }
    };
    
    loadGuardProperties();
    
    return () => {
      mounted = false;
    };
  }, [open, propertiesCacheLoaded, guardId]);

  // Precargar datos del guardia actual al abrir el modal
  React.useEffect(() => {
    if (!open || guardCacheLoaded || !guardId) return;
    
    let mounted = true;
    const loadCurrentGuard = async () => {
      try {
        console.log(`Precargando datos del guardia ${guardId}...`);
        const guardData = await getGuard(guardId);
        if (!mounted) return;
        
        setCurrentGuardCache(guardData);
        setGuardCacheLoaded(true);
        console.log(`✅ Precargados datos del guardia:`, guardData);
      } catch (error) {
        console.error("❌ Error precargando datos del guardia:", error);
      }
    };
    
    loadCurrentGuard();
    
    return () => {
      mounted = false;
    };
  }, [open, guardCacheLoaded, guardId]);

  // Función para refrescar/actualizar datos (no duplicar)
  async function refresh() {
    setLoading(true);
    try {
      const res = await listShiftsByGuard(guardId, 1, 100, "-start_time");
      const normalized = normalizeShiftsArray(res);
      setShifts(normalized); // Reemplazar, no agregar

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
      
      toast.success("Datos actualizados");
    } catch (err) {
      console.error("[Refresh] error:", err);
      toast.error("Error al actualizar datos");
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
  
  // Estado para propiedad preseleccionada en crear turno
  const [createShiftPropertyId, setCreateShiftPropertyId] = React.useState<number | null>(null);

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
                  // TODO: Implementar exportación
                  toast.info("Función de exportar en desarrollo");
                }}
                className="h-8 w-8 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                onClick={() => {
                  setCreateShiftPropertyId(null); // No preseleccionar propiedad desde header
                  setOpenCreate(true);
                }}
                className="h-8"
                disabled={!propertiesCacheLoaded}
              >
                <Plus className="h-3 w-3 mr-1" />
                {!propertiesCacheLoaded ? "Cargando..." : (TEXT?.shifts?.create?.title ?? "Crear")}
              </Button>
            </div>
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
                            }}
                            modifiersStyles={{
                              hasShifts: {
                                fontWeight: "bold",
                              }
                            }}
                            components={{
                              DayButton: (props: any) => {
                                const dateKey = props.day.date.toDateString();
                                const properties = datePropertyMap[dateKey] || [];
                                const hasShifts = properties.length > 0;
                                
                                // Verificar si este día tiene solapamientos
                                const hasOverlap = overlapDays.has(props.day.date.toLocaleDateString());
                                
                                // Verificar si este día tiene turnos de la propiedad seleccionada
                                const hasSelectedPropertyShift = selectedPropertyId ? 
                                  properties.some(p => p.propertyId === selectedPropertyId) : false;
                                
                                // Color de la propiedad seleccionada para el sombreado
                                const selectedPropertyColor = selectedPropertyId ? 
                                  (propertyColors[selectedPropertyId] || PROPERTY_COLORS[selectedPropertyId % PROPERTY_COLORS.length]) : null;
                                
                                return (
                                  <button
                                    {...props}
                                    className={cn(
                                      "relative group/day aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal text-sm p-1 transition-all duration-200",
                                      "hover:bg-accent hover:text-accent-foreground rounded-md",
                                      // Estilos para día seleccionado
                                      props.modifiers?.selected && "bg-primary text-primary-foreground ring-2 ring-primary/20",
                                      // Estilos para día de hoy
                                      props.modifiers?.today && !props.modifiers?.selected && "bg-accent text-accent-foreground font-bold ring-1 ring-accent",
                                      // Estilo para días con solapamientos (prioridad alta)
                                      hasOverlap && !props.modifiers?.selected && "bg-red-100 border-2 border-red-400 shadow-lg ring-2 ring-red-200",
                                      // Sombra sutil para días con guardias (cualquier guardia) - solo si no hay solapamiento
                                      hasShifts && !props.modifiers?.selected && !hasSelectedPropertyShift && !hasOverlap && "shadow-sm bg-blue-50/60 border border-blue-100/80",
                                      // Sombreado del color de la propiedad seleccionada - solo si no hay solapamiento
                                      hasSelectedPropertyShift && !props.modifiers?.selected && !hasOverlap && "shadow-md border-2",
                                      props.className
                                    )}
                                    style={{
                                      ...props.style,
                                      // Aplicar color de fondo y borde cuando hay propiedad seleccionada
                                      ...(hasSelectedPropertyShift && selectedPropertyColor && !props.modifiers?.selected && {
                                        backgroundColor: `${selectedPropertyColor}15`, // 15 es ~8% opacity en hex
                                        borderColor: `${selectedPropertyColor}80`, // 80 es ~50% opacity en hex
                                        boxShadow: `0 2px 4px ${selectedPropertyColor}25` // 25 es ~15% opacity en hex
                                      })
                                    }}
                                  >
                                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                                      {/* Número del día */}
                                      <span className={cn(
                                        "text-sm",
                                        hasShifts && "font-semibold"
                                      )}>
                                        {props.day.date.getDate()}
                                      </span>
                                      
                                      {/* Círculos de propiedades en la parte inferior */}
                                      {properties.length > 0 && (
                                        <div className="absolute bottom-0.5 flex justify-center gap-0.5 flex-wrap max-w-full">
                                          {properties.slice(0, 6).map((prop, idx) => (
                                            <div
                                              key={`${prop.propertyId}-${idx}`}
                                              className={cn(
                                                "w-1.5 h-1.5 rounded-full border transition-all duration-200",
                                                selectedPropertyId === prop.propertyId 
                                                  ? "border-white/90 shadow-sm ring-1 ring-white/30 scale-110" 
                                                  : "border-white/30"
                                              )}
                                              style={{ backgroundColor: prop.color }}
                                              title={`Property ${prop.propertyId}`}
                                            />
                                          ))}
                                          {properties.length > 6 && (
                                            <div 
                                              className="w-1.5 h-1.5 rounded-full bg-gray-500 border border-white/30 flex items-center justify-center shadow-sm"
                                              title={`+${properties.length - 6} more properties`}
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

                        {/* Alerta de solapamientos */}
                        {overlapAlert && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                  ⚠️ Solapamientos Detectados
                                </h3>
                                <div className="mt-1 text-sm text-red-700">
                                  {overlapAlert}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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
                          Propiedades ({filteredProperties.length})
                        </CardTitle>
                        
                        <div className="flex items-center gap-2">
                          {/* Botón de limpiar filtros cuando hay filtros activos */}
                          {(selectedPropertyId || propertyTimeFilter !== "all" || propertySearchQuery.trim()) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPropertyId(null);
                                setPropertyTimeFilter("all");
                                setPropertySearchQuery("");
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Filter className="h-3 w-3 mr-1" />
                              Limpiar
                            </Button>
                          )}
                          
                          {/* Dropdown de filtros temporales */}
                          <Select value={propertyTimeFilter} onValueChange={setPropertyTimeFilter}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="Filtrar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="future">Futuros</SelectItem>
                              <SelectItem value="current">Actuales</SelectItem>
                              <SelectItem value="past">Pasados</SelectItem>
                              <SelectItem value="no-shifts">Sin turnos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                      {/* Campo de búsqueda */}
                      <div className="px-3 pb-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nombre o alias..."
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
                      
                      {/* Lista de propiedades filtradas */}
                      <ScrollArea className="h-[calc(95vh-360px)] w-full">
                        <div className="space-y-2 px-3 pb-2">
                          {filteredProperties.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              {propertySearchQuery.trim() ? 
                                "No se encontraron propiedades" : 
                                propertyTimeFilter === 'no-shifts' ? 
                                  "No hay propiedades sin turnos" :
                                  "No hay propiedades con turnos"
                              }
                            </div>
                          ) : (
                            filteredProperties.map((propData) => {
                              const hasPropertyOverlap = overlapProperties.has(propData.property.id);
                              
                              return (
                              <div
                                key={propData.property.id}
                                className={cn(
                                  "p-2 rounded border transition-all hover:shadow-sm",
                                  // Estilo para solapamiento (prioridad alta)
                                  hasPropertyOverlap 
                                    ? "border-red-400 bg-red-50 shadow-md ring-2 ring-red-200" 
                                    : selectedPropertyId === propData.property.id
                                      ? "border-primary bg-primary/10 shadow-sm"
                                      : "border-transparent bg-muted/50 hover:bg-muted"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  {/* Indicador de solapamiento */}
                                  {hasPropertyOverlap && (
                                    <div className="flex-shrink-0 mt-1">
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Propiedad con solapamientos" />
                                    </div>
                                  )}
                                  
                                  {/* Contenido principal de la propiedad */}
                                  <div 
                                    className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
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
                                  
                                  {/* Botón + para crear turno */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Evitar que se active el click de la propiedad
                                      setCreateShiftPropertyId(propData.property.id);
                                      setOpenCreate(true);
                                    }}
                                    className="h-6 w-6 p-0 flex-shrink-0 hover:bg-primary/10 hover:text-primary"
                                    title={`Crear turno para ${propData.property.name || propData.property.alias || `Propiedad ${propData.property.id}`}`}
                                    disabled={!propertiesCacheLoaded}
                                  >
                                    {!propertiesCacheLoaded ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
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
                    <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
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
                                        {propData.shifts.map((shift: Shift) => {
                                          const hasShiftOverlap = overlapShifts.has(shift.id);
                                          
                                          return (
                                          <div 
                                            key={shift.id} 
                                            className={cn(
                                              "flex items-center justify-between text-xs p-2 rounded",
                                              hasShiftOverlap 
                                                ? "bg-red-100 border border-red-300 shadow-sm" 
                                                : "hover:bg-muted/30"
                                            )}
                                          >
                                            <div className="flex items-center gap-2">
                                              {/* Indicador de solapamiento */}
                                              {hasShiftOverlap && (
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" title="Turno con solapamiento" />
                                              )}
                                              <Clock className={cn("h-3 w-3", hasShiftOverlap && "text-red-600")} />
                                              <span className={hasShiftOverlap ? "text-red-800 font-medium" : ""}>
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
                                          );
                                        })}
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
                              const hasShiftOverlap = overlapShifts.has(s.id);
                              
                              return (
                                <div
                                  key={s.id}
                                  className={cn(
                                    "flex items-center justify-between gap-2 rounded border p-2 shadow-sm transition-shadow",
                                    hasShiftOverlap 
                                      ? "bg-red-50 border-red-300 shadow-md" 
                                      : "bg-card hover:shadow-sm"
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Indicador de solapamiento */}
                                    {hasShiftOverlap && (
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-2 flex-shrink-0" title="Turno con solapamiento" />
                                    )}
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

                                      <div className={cn("text-sm font-semibold", hasShiftOverlap && "text-red-800")}>
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

                                      <div className={cn("text-sm flex items-center gap-2", hasShiftOverlap && "text-red-700")}>
                                        <Clock className={cn("h-3 w-3", hasShiftOverlap && "text-red-600")} />
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
        </div>
      </DialogContent>

      <CreateShift
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          setCreateShiftPropertyId(null); // Limpiar propiedad preseleccionada
        }}
        guardId={guardId}
        selectedDate={selectedDate}
        propertyId={createShiftPropertyId}
        preloadedProperties={allPropertiesCache}
        preloadedGuard={currentGuardCache}
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
