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
  Eye,
  Pencil,
  Trash,
  Filter,
  MapPin,
  User,
  Clock,
  BarChart3,
  Download,
  Search,
  AlertTriangle,
  MessageCircle,
  MoveVertical,
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
import { listShiftsByProperty, updateShift, createShift } from "@/lib/services/shifts";
import { getProperty } from "@/lib/services/properties";
import type { AppProperty } from "@/lib/services/properties";
import { listGuards } from "@/lib/services/guard";
import { listServicesByProperty } from "@/lib/services/services";
import type { Service } from "@/components/Services/types";
import type { Guard } from "@/components/Guards/types";
import { listShiftsByService } from "@/lib/services/shifts";
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

// (No direct use of combined arrays; colors are assigned via maps)

function assignColorsForIds(
  existing: Record<number, string>,
  ids: number[],
  vibrant: string[],
  fallback: string[],
): Record<number, string> {
  const used = new Set(Object.values(existing));
  const next = { ...existing };
  ids.forEach((id) => {
    if (next[id]) return;
    let color = vibrant.find((c) => !used.has(c));
    if (!color) color = fallback.find((c) => !used.has(c));
    if (!color) {
      const all = [...vibrant, ...fallback];
      color = all[id % all.length];
    }
    next[id] = color!;
    used.add(color!);
  });
  return next;
}

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

    const serviceId =
      s.service ??
      s.service_id ??
      (s.service_details
        ? s.service_details.id ?? s.service_details.pk ?? undefined
        : undefined) ??
      (s.service && typeof s.service === "object" ? s.service.id : undefined) ??
      null;

    return {
      id: s.id ?? s.pk ?? 0,
      guard: guardId,
      property: propertyId,
      service: serviceId,
      plannedStartTime: s.planned_start_time ?? s.plannedStartTime ?? null,
      plannedEndTime: s.planned_end_time ?? s.plannedEndTime ?? null,
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

type GuardWithShifts = {
  guard: Guard;
  shifts: Shift[];
  color: string;
  totalHours: number;
};

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
  propertyId: number;
  propertyName?: string;
  open: boolean;
  onClose: () => void;
  initialSelectedDate?: Date;
};

// Función para normalizar fechas de manera consistente (fuera del componente para estabilidad)
const normalizeDateKey = (date: Date): string => {
  // Usar formato ISO simple YYYY-MM-DD para evitar problemas de zona horaria
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PropertyShiftsModalImproved({
  propertyId,
  propertyName,
  open,
  onClose,
  initialSelectedDate,
}: Props) {
  const { TEXT } = useI18n();

  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    initialSelectedDate
  );
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | null>(null);
  const [selectedGuardId, setSelectedGuardId] = React.useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = React.useState<number | null>(null);

  // Cache de propiedades { [id]: AppProperty | null }
  const [propertyMap, setPropertyMap] = React.useState<
    Record<number, AppProperty | null>
  >({});
  const [propertyColors, setPropertyColors] = React.useState<Record<number, string>>({});
  const [guardColors, setGuardColors] = React.useState<Record<number, string>>({});
  const [loadingProps, setLoadingProps] = React.useState<boolean>(false);
  
  // Estados para filtrado de propiedades
  // (deprecated) filtros de propiedades no usados
  
  // Estados para filtros de guardias
  const [guardTimeFilter, setGuardTimeFilter] = React.useState<string>("all");
  const [guardSearchQuery, setGuardSearchQuery] = React.useState<string>("");
  
  // Cache de todas las propiedades para mejorar rendimiento
  const [allGuardsCache, setAllGuardsCache] = React.useState<Guard[]>([]);
  const [allServicesCache, setAllServicesCache] = React.useState<Service[]>([]);
  const [guardsCacheLoaded, setGuardsCacheLoaded] = React.useState<boolean>(false);
  const [servicesCacheLoaded, setServicesCacheLoaded] = React.useState<boolean>(false);
  
  // Cache del datos de la propiedad actual
  const [currentPropertyCache, setCurrentPropertyCache] = React.useState<any | null>(null);

  // Estados para manejo de solapamientos
  const [overlapDays, setOverlapDays] = React.useState<Set<string>>(new Set());
  const [overlapAlert, setOverlapAlert] = React.useState<string>("");
  const [overlapShifts, setOverlapShifts] = React.useState<Set<number>>(new Set());
  const [overlapGuards, setOverlapGuards] = React.useState<Set<number>>(new Set());

  // Datos procesados para el calendario estilo Windows
  const processedData = React.useMemo(() => {
    // Filtrar shifts según servicio seleccionado
    let relevantShifts = shifts;
    if (selectedServiceId !== null) {
      relevantShifts = shifts.filter(shift => shift.service === selectedServiceId);
    }
    
    // Agrupar shifts por fecha
    const dayGroups: Record<string, DayWithShifts> = {};
    
    relevantShifts.forEach((shift) => {
      // Usar planned_start_time si start_time es null
      const startTimeStr = shift.startTime || shift.plannedStartTime;
      if (!startTimeStr) return;
      
      const date = new Date(startTimeStr);
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
            color: propertyColors[propId] || VIBRANT_COLORS[propId % VIBRANT_COLORS.length] || FALLBACK_COLORS[propId % FALLBACK_COLORS.length],
            totalHours: 0,
          };
        }
        
        propertyGroups[propId].shifts.push(shift);
        propertyGroups[propId].totalHours += shift.hoursWorked || 0;
      });
      
      dayData.properties = Object.values(propertyGroups);
    });

    return dayGroups;
  }, [shifts, propertyMap, propertyColors, selectedServiceId]);

  // Días con turnos para el calendario
  // Helpers de fechas (clave YYYY-MM-DD y parser robusto)
  const dateKey = React.useCallback((d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const parseBackendDate = React.useCallback((dateStr: string): Date | null => {
    if (!dateStr) return null;
    // Prefer parse YYYY-MM-DD safely to local date (avoid TZ shifts)
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      return new Date(y, mo, d, 0, 0, 0, 0);
    }
    // Fallback: try Date constructor (can be ISO with time)
    const dt = new Date(dateStr);
    return isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }, []);

  // Días con turnos o permitidos para mostrar en el calendario
  const { allowedDates, allowedSet, fromMonth, toMonth } = React.useMemo(() => {
    // Si hay servicio seleccionado y tiene schedule, usarlo como días permitidos
    if (selectedServiceId !== null) {
      const svc = allServicesCache.find((s) => s.id === selectedServiceId);
      const dates: Date[] = [];
      const set = new Set<string>();
      if (svc?.schedule && Array.isArray(svc.schedule)) {
        for (const s of svc.schedule) {
          const d = parseBackendDate(String(s));
          if (d) {
            const k = dateKey(d);
            if (!set.has(k)) {
              set.add(k);
              dates.push(d);
            }
          }
        }
      }
      // Calcular límites de navegación
      if (dates.length > 0) {
        const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const fm = new Date(min.getFullYear(), min.getMonth(), 1);
        const tm = new Date(max.getFullYear(), max.getMonth(), 1);
        return { allowedDates: dates, allowedSet: set, fromMonth: fm, toMonth: tm };
      }
      return { allowedDates: dates, allowedSet: set, fromMonth: undefined, toMonth: undefined };
    }
    // Sin servicio: usar días con turnos (comportamiento previo)
    const dates = Object.values(processedData).map((day) => day.date);
    return { allowedDates: dates, allowedSet: null as any, fromMonth: undefined, toMonth: undefined };
  }, [selectedServiceId, allServicesCache, processedData, parseBackendDate, dateKey]);

  // Función para deshabilitar días cuando hay servicio seleccionado
  const disabledDays = React.useMemo(() => {
    if (selectedServiceId === null) return undefined;
    // Si hay servicio pero sin schedule, deshabilitar todos los días
    if (!allowedSet || (allowedDates?.length ?? 0) === 0) {
      return { before: new Date(2100, 0, 1) } as any;
    }
    return (date: Date) => !allowedSet.has(dateKey(date));
  }, [selectedServiceId, allowedSet, allowedDates, dateKey]);

  // Asegurar que la fecha seleccionada siga siendo válida al cambiar servicio/schedule
  React.useEffect(() => {
    if (selectedServiceId !== null && selectedDate && allowedSet) {
      const k = dateKey(selectedDate);
      if (!allowedSet.has(k)) {
        setSelectedDate(undefined);
      }
    }
  }, [selectedServiceId, allowedSet, selectedDate, dateKey]);

  // Detectar días con solapamientos GLOBALES (mismo guardia, cualquier servicio)
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

    // Verificar solapamientos día por día (TODOS los turnos, no filtrar por servicio)
    Object.values(processedData).forEach((dayData) => {
      // Usar todos los shifts sin filtrar por servicio para detectar solapamientos globales
      const allDayShifts = shifts.filter(shift => {
        const startTimeStr = shift.startTime || shift.plannedStartTime;
        if (!startTimeStr) return false;
        const shiftDate = new Date(startTimeStr);
        return shiftDate.toDateString() === dayData.date.toDateString();
      });

      if (allDayShifts.length < 2) return; // No puede haber solapamiento con menos de 2 turnos

      for (let i = 0; i < allDayShifts.length; i++) {
        for (let j = i + 1; j < allDayShifts.length; j++) {
          const shift1 = allDayShifts[i];
          const shift2 = allDayShifts[j];

          // Solo consideramos solapamiento si es el MISMO guardia (independiente del servicio)
          const g1 = shift1.guard != null ? Number(shift1.guard) : null;
          const g2 = shift2.guard != null ? Number(shift2.guard) : null;
          const start1 = shift1.startTime || shift1.plannedStartTime;
          const end1 = shift1.endTime || shift1.plannedEndTime;
          const start2 = shift2.startTime || shift2.plannedStartTime;
          const end2 = shift2.endTime || shift2.plannedEndTime;
          
          if (g1 != null && g2 != null && g1 === g2 && start1 && end1 && start2 && end2) {
            if (checkTimeOverlap(start1, end1, start2, end2)) {
              const dateKey = normalizeDateKey(dayData.date);
              overlaps.add(dateKey);
              
              // Marcar turnos específicos con solapamiento
              overlappingShifts.add(shift1.id);
              overlappingShifts.add(shift2.id);
              
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
  }, [shifts, processedData]); // Cambiado: usar shifts completos, no processedData filtrado

  React.useEffect(() => {
    setOverlapDays(overlapDetection.overlaps);
    // Habilitar overlap alert para solapamientos globales
    setOverlapShifts(overlapDetection.overlappingShifts);
    // Calcular guardias con solapamientos a partir de los turnos solapados
    const guardIds = new Set<number>();
    overlapDetection.overlappingShifts.forEach((sid) => {
      const sh = shifts.find((s) => s.id === sid);
      if (sh?.guard != null) guardIds.add(Number(sh.guard));
    });
    setOverlapGuards(guardIds);
    setOverlapAlert(overlapDetection.message);
  }, [overlapDetection, shifts]);

  // Detectar gaps de cobertura POR SERVICIO (solo días y horarios del servicio seleccionado)
  const gapDetection = React.useMemo(() => {
    const intervalsByDay: Record<string, Array<{ start: number; end: number }>> = {};
    const gapDays = new Set<string>();
    const gapsMap: Record<string, Array<{ start: number; end: number }>> = {};
    const MIN_GAP_MS = 15 * 60 * 1000; // 15 minutos

    // Solo calcular gaps si hay un servicio seleccionado
    if (selectedServiceId === null) {
      return { gapDays, gapsMap };
    }

    // Buscar el servicio seleccionado PRIMERO en allServicesCache, luego en serviceDetails
    let selectedService: any = allServicesCache.find((s: Service) => s.id === selectedServiceId);
    
    // Si no se encuentra en cache, usar serviceDetails del turno
    if (!selectedService) {
      const selectedServiceFromShifts = shifts.find(shift => shift.service === selectedServiceId);
      if (!selectedServiceFromShifts?.serviceDetails) {
        return { gapDays, gapsMap };
      }
      selectedService = selectedServiceFromShifts.serviceDetails as any;
    }

    // Verificar que tenga las propiedades necesarias (usar ambos formatos posibles)
    const startTime = selectedService.startTime || selectedService.start_time;
    const endTime = selectedService.endTime || selectedService.end_time;
    
    if (!selectedService.schedule || !startTime || !endTime) {
      return { gapDays, gapsMap };
    }

    // Parsear horario del servicio
    const parseTime = (timeStr: string): { hours: number; minutes: number } => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { hours: hours || 0, minutes: minutes || 0 };
    };

    const serviceStartTime = parseTime(startTime);
    const serviceEndTime = parseTime(endTime);

    // Filtrar shifts solo del servicio seleccionado
    const serviceShifts = shifts.filter(shift => shift.service === selectedServiceId);

    const addInterval = (dateKey: string, start: number, end: number) => {
      if (end <= start) return;
      if (!intervalsByDay[dateKey]) intervalsByDay[dateKey] = [];
      intervalsByDay[dateKey].push({ start, end });
    };

    serviceShifts.forEach((s) => {
      const startTimeStr = s.startTime || s.plannedStartTime;
      if (!startTimeStr) return;
      
      const st = new Date(startTimeStr);
      const endTimeStr = s.endTime || s.plannedEndTime;
      const et = endTimeStr ? new Date(endTimeStr) : new Date(st.getTime() + 60 * 60 * 1000);
      
      // Solo considerar turnos que están en fechas específicas del schedule del servicio
      const shiftDateKey = normalizeDateKey(st);
      const isScheduledDay = selectedService.schedule && Array.isArray(selectedService.schedule) && 
        selectedService.schedule.includes(shiftDateKey);
      
      if (!isScheduledDay) return; // Este turno no está en un día programado del servicio

      const dkStart = shiftDateKey;
      
      // Intersección del turno con la ventana de servicio
      const serviceDate = new Date(st.getFullYear(), st.getMonth(), st.getDate());
      const serviceStart = new Date(serviceDate.getTime() + serviceStartTime.hours * 60 * 60 * 1000 + serviceStartTime.minutes * 60 * 1000);
      let serviceEnd = new Date(serviceDate.getTime() + serviceEndTime.hours * 60 * 60 * 1000 + serviceEndTime.minutes * 60 * 1000);
      
      // Si el servicio termina antes de empezar, significa que cruza la medianoche
      if (serviceEnd <= serviceStart) {
        serviceEnd = new Date(serviceEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      
      // Convertir turno a hora local para comparar con servicio
      const shiftStartLocal = new Date(st.getTime());
      const shiftEndLocal = new Date(et.getTime());
      
      const intervalStart = Math.max(shiftStartLocal.getTime(), serviceStart.getTime());
      const intervalEnd = Math.min(shiftEndLocal.getTime(), serviceEnd.getTime());
      
      if (intervalEnd > intervalStart) {
        addInterval(dkStart, intervalStart, intervalEnd);
      }
    });

    // Merge intervals y calcular gaps solo dentro del horario del servicio
    // Usar únicamente las fechas específicas del array 'schedule' del servicio
    const serviceDays = new Set<string>();
    if (selectedService.schedule && Array.isArray(selectedService.schedule)) {
      // Usar directamente las fechas del schedule del backend
      selectedService.schedule.forEach((dateStr: string) => {
        // Las fechas del backend vienen como "2025-09-22", usarlas directamente
        serviceDays.add(dateStr);
      });
    }

    // Ahora procesar cada día que requiere servicio (según el schedule específico)
    serviceDays.forEach((dk) => {
      const intervals = intervalsByDay[dk] || []; // Puede estar vacío si no hay turnos
      
      // Merge intervals si los hay
      const merged = intervals.length > 0 ? intervals
        .sort((a, b) => a.start - b.start)
        .reduce((acc: Array<{ start: number; end: number }>, cur) => {
          const last = acc[acc.length - 1];
          if (!last || cur.start > last.end) acc.push({ ...cur });
          else last.end = Math.max(last.end, cur.end);
          return acc;
        }, []) : [];

      // Calcular ventana de servicio para este día específico usando las horas del servicio
      // dk es ahora un string "2025-09-22", crear fecha local
      const [year, month, day] = dk.split('-').map(Number);
      const serviceDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-based months
      const serviceStart = new Date(serviceDate.getTime() + serviceStartTime.hours * 60 * 60 * 1000 + serviceStartTime.minutes * 60 * 1000);
      let serviceEnd = new Date(serviceDate.getTime() + serviceEndTime.hours * 60 * 60 * 1000 + serviceEndTime.minutes * 60 * 1000);
      
      if (serviceEnd <= serviceStart) {
        serviceEnd = new Date(serviceEnd.getTime() + 24 * 60 * 60 * 1000);
      }

      const gaps: Array<{ start: number; end: number }> = [];

      if (merged.length === 0) {
        // No hay turnos en absoluto para este día de servicio - gap completo
        gaps.push({ start: serviceStart.getTime(), end: serviceEnd.getTime() });
      } else {
        // Gap inicial (desde inicio del servicio hasta primera cobertura)
        if (merged[0].start > serviceStart.getTime()) {
          gaps.push({ start: serviceStart.getTime(), end: merged[0].start });
        }
        
        // Gaps intermedios
        for (let i = 0; i < merged.length - 1; i++) {
          const gapStart = merged[i].end;
          const gapEnd = merged[i + 1].start;
          if (gapEnd > gapStart) gaps.push({ start: gapStart, end: gapEnd });
        }
        
        // Gap final (desde última cobertura hasta fin del servicio)
        if (merged[merged.length - 1].end < serviceEnd.getTime()) {
          gaps.push({ start: merged[merged.length - 1].end, end: serviceEnd.getTime() });
        }
      }

      // Filtrar gaps pequeños y registrar si hay algún gap significativo
      const significant = gaps.filter(g => g.end - g.start >= MIN_GAP_MS);
      if (significant.length > 0) {
        gapsMap[dk] = significant;
        gapDays.add(dk);
      }
    });

    return { gapDays, gapsMap };
  }, [shifts, selectedServiceId, allServicesCache]); // Agregado allServicesCache

  // Mapa de fecha -> guardias con turnos para mostrar círculos
  const dateGuardMap = React.useMemo(() => {
    const map: Record<string, Array<{ guardId: number; color: string; shiftCount: number }>> = {};

    const DAY_MS = 24 * 60 * 60 * 1000;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // Filtrar shifts según servicio seleccionado
    let relevantShifts = shifts;
    if (selectedServiceId !== null) {
      relevantShifts = shifts.filter(shift => shift.service === selectedServiceId);
    }

    relevantShifts.forEach((shift) => {
      // Usar planned_start_time si start_time es null
      const startTimeStr = shift.startTime || shift.plannedStartTime;
      if (!startTimeStr) return;
      const st = new Date(startTimeStr);
      const endTimeStr = shift.endTime || shift.plannedEndTime;
      const et = endTimeStr ? new Date(endTimeStr) : new Date(st.getTime() + 60 * 60 * 1000);
      const guardId = Number(shift.guard);
  const color = guardColors[guardId] || VIBRANT_COLORS[guardId % VIBRANT_COLORS.length] || FALLBACK_COLORS[guardId % FALLBACK_COLORS.length];

      // Iterate every day touched by the shift (cross-midnight support)
      let dayCursor = startOfDay(st);
      while (dayCursor.getTime() < et.getTime()) {
        const key = normalizeDateKey(dayCursor);
        if (!map[key]) map[key] = [];
        const existing = map[key].find((g) => g.guardId === guardId);
        if (existing) existing.shiftCount += 1;
        else map[key].push({ guardId, color, shiftCount: 1 });
        dayCursor = new Date(dayCursor.getTime() + DAY_MS);
      }
    });

    return map;
  }, [shifts, guardColors, selectedServiceId]);

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
          color: propertyColors[propId] || VIBRANT_COLORS[propId % VIBRANT_COLORS.length] || FALLBACK_COLORS[propId % FALLBACK_COLORS.length],
          totalHours: 0,
        };
      }
      
      propertyGroups[propId].shifts.push(shift);
      propertyGroups[propId].totalHours += shift.hoursWorked || 0;
    });
    
    return Object.values(propertyGroups);
  }, [shifts, propertyMap, propertyColors]);

  // Lista de guardias filtrada y ordenada
  const allGuards = React.useMemo(() => {
    // Crear un mapa de guardias desde el cache para acceso rápido
    const guardLookup: Record<number, Guard> = {};
    allGuardsCache.forEach(guard => {
      guardLookup[guard.id] = guard;
    });
    
    // Si hay servicio seleccionado, mostrar guardias que tienen turnos asociados a ese servicio
    if (selectedServiceId !== null) {
      const guardGroups: Record<number, GuardWithShifts> = {};
      
      // Filtrar turnos que pertenecen al servicio seleccionado
      const serviceShifts = shifts.filter(shift => shift.service === selectedServiceId);
      //console.log(`🔍 Turnos del servicio ${selectedServiceId}:`, serviceShifts.length);
      
      serviceShifts.forEach((shift) => {
        const guardId = shift.guard ? Number(shift.guard) : -1;
        const guard = guardLookup[guardId] || null;
        
        // Solo procesar si tenemos ID de guardia válido
        if (guardId !== -1) {
          if (!guardGroups[guardId]) {
            guardGroups[guardId] = {
              guard: guard || { 
                id: guardId, 
                firstName: `Guardia`,
                lastName: `${guardId}`, 
                email: '' 
              } as Guard,
              shifts: [],
              color: guardColors[guardId] || VIBRANT_COLORS[guardId % VIBRANT_COLORS.length] || FALLBACK_COLORS[guardId % FALLBACK_COLORS.length],
              totalHours: 0,
            };
          }
          
          guardGroups[guardId].shifts.push(shift);
          guardGroups[guardId].totalHours += shift.hoursWorked || 0;
        }
      });
      
      const serviceGuards = Object.values(guardGroups);
      //console.log(`🔍 Guardias encontrados para servicio ${selectedServiceId}:`, serviceGuards.map(g => `${g.guard.firstName} ${g.guard.lastName}`));
      
      // Si no hay guardias con turnos para este servicio, devolver array vacío
      if (serviceGuards.length === 0) {
        //console.log(`⚠️ No se encontraron guardias con turnos para el servicio ${selectedServiceId}`);
        return [];
      }
      
      // Aplicar filtros adicionales y ordenamiento
      let result = serviceGuards;

      // Filtrar por búsqueda
      if (guardSearchQuery.trim()) {
        const query = guardSearchQuery.toLowerCase();
        result = result.filter(guardData => {
          const guard = guardData.guard;
          const fullName = `${guard.firstName || ""} ${guard.lastName || ""}`.toLowerCase();
          const email = (guard.email || "").toLowerCase();
          return fullName.includes(query) || 
                 email.includes(query) ||
                 `guardia ${guard.id}`.includes(query);
        });
      }

      // Filtrar por tiempo
      if (guardTimeFilter !== "all") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const thisWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        result = result.filter(guardData => {
          const hasRecentShifts = guardData.shifts.some(shift => {
            if (!shift.startTime) return false;
            const shiftDate = new Date(shift.startTime);
            
            switch (guardTimeFilter) {
              case "today": return shiftDate >= today && shiftDate < tomorrow;
              case "week": return shiftDate >= thisWeek;
              case "month": return shiftDate >= thisMonth;
              default: return true;
            }
          });
          
          return guardTimeFilter === "no-shifts" ? !hasRecentShifts : hasRecentShifts;
        });
      }
      
      // Ordenar por última fecha de trabajo (más reciente primero)
      return result.sort((a, b) => {
        const aLastShift = a.shifts
          .filter(s => s.startTime)
          .sort((x, y) => new Date(y.startTime!).getTime() - new Date(x.startTime!).getTime())[0];
        const bLastShift = b.shifts
          .filter(s => s.startTime)
          .sort((x, y) => new Date(y.startTime!).getTime() - new Date(x.startTime!).getTime())[0];
        
        if (!aLastShift?.startTime && !bLastShift?.startTime) return 0;
        if (!aLastShift?.startTime) return 1;
        if (!bLastShift?.startTime) return -1;
        
        return new Date(bLastShift.startTime).getTime() - new Date(aLastShift.startTime).getTime();
      });
    }
    
    // Si no hay servicio seleccionado, mostrar guardias que tienen turnos en la propiedad
    const guardGroups: Record<number, GuardWithShifts> = {};
    
    shifts.forEach((shift) => {
      const guardId = shift.guard ? Number(shift.guard) : -1;
      const guard = guardLookup[guardId] || null;
      
      // Solo procesar si tenemos ID de guardia válido
      if (guardId !== -1) {
        if (!guardGroups[guardId]) {
          guardGroups[guardId] = {
            guard: guard || { 
              id: guardId, 
              firstName: `Guardia`,
              lastName: `${guardId}`, 
              email: '' 
            } as Guard,
            shifts: [],
            color: guardColors[guardId] || VIBRANT_COLORS[guardId % VIBRANT_COLORS.length] || FALLBACK_COLORS[guardId % FALLBACK_COLORS.length],
            totalHours: 0,
          };
        }
        
        guardGroups[guardId].shifts.push(shift);
        guardGroups[guardId].totalHours += shift.hoursWorked || 0;
      }
    });
    
    let result = Object.values(guardGroups);

    // Filtrar por búsqueda
    if (guardSearchQuery.trim()) {
      const query = guardSearchQuery.toLowerCase();
      result = result.filter(guardData => {
        const guard = guardData.guard;
        const fullName = `${guard.firstName || ""} ${guard.lastName || ""}`.toLowerCase();
        const email = (guard.email || "").toLowerCase();
        return fullName.includes(query) || 
               email.includes(query) ||
               `guardia ${guard.id}`.includes(query);
      });
    }

    // Filtrar por tiempo
    if (guardTimeFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const thisWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      result = result.filter(guardData => {
        const hasRecentShifts = guardData.shifts.some(shift => {
          if (!shift.startTime) return false;
          const shiftDate = new Date(shift.startTime);
          
          switch (guardTimeFilter) {
            case "today": return shiftDate >= today && shiftDate < tomorrow;
            case "week": return shiftDate >= thisWeek;
            case "month": return shiftDate >= thisMonth;
            default: return true;
          }
        });
        
        return guardTimeFilter === "no-shifts" ? !hasRecentShifts : hasRecentShifts;
      });
    }
    
    // Ordenar por última fecha de trabajo (más reciente primero)
    return result.sort((a, b) => {
      const aLastShift = a.shifts
        .filter(s => s.startTime)
        .sort((x, y) => new Date(y.startTime!).getTime() - new Date(x.startTime!).getTime())[0];
      const bLastShift = b.shifts
        .filter(s => s.startTime)
        .sort((x, y) => new Date(y.startTime!).getTime() - new Date(x.startTime!).getTime())[0];
      
      if (!aLastShift?.startTime && !bLastShift?.startTime) return 0;
      if (!aLastShift?.startTime) return 1;
      if (!bLastShift?.startTime) return -1;
      
      return new Date(bLastShift.startTime).getTime() - new Date(aLastShift.startTime).getTime();
    });
  }, [shifts, allGuardsCache, guardColors, guardSearchQuery, guardTimeFilter, selectedServiceId, allServicesCache]);


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
    } else if (selectedGuardId !== null) {
      // Si hay guardia seleccionado, mostrar solo turnos de ese guardia
      result = result.filter((shift) => {
        return shift.guard === selectedGuardId;
      });
    } else if (selectedPropertyId !== null) {
      // Si hay propiedad seleccionada, mostrar solo turnos de esa propiedad
      result = result.filter((shift) => {
        return shift.property === selectedPropertyId;
      });
    } else if (selectedServiceId !== null) {
      // Si hay servicio seleccionado, mostrar solo turnos de ese servicio
      result = result.filter((shift) => {
        return shift.service === selectedServiceId;
      });
    }
    
    // Ordenar por fecha: último trabajo realizado primero
    return result.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [shifts, selectedDate, selectedGuardId, selectedPropertyId, selectedServiceId]);

  // Estadísticas
  const statistics = React.useMemo(() => {
    // Usar turnos filtrados si hay servicio seleccionado
    const relevantShifts = selectedServiceId !== null 
      ? shifts.filter(s => s.service === selectedServiceId)
      : shifts;
      
    const total = relevantShifts.length;
    const completed = relevantShifts.filter(s => s.status === 'completed').length;
    const scheduled = relevantShifts.filter(s => s.status === 'scheduled').length;
    const voided = relevantShifts.filter(s => s.status === 'voided').length;
    const totalHours = relevantShifts.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    
    return { total, completed, scheduled, voided, totalHours };
  }, [shifts, selectedServiceId]);

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

  // Extraer teléfono del guardia y normalizar para WhatsApp
  function getGuardPhone(g?: Guard | null): string | null {
    if (!g) return null;
    const anyG: any = g;
    const cand =
      anyG.phoneNumber || anyG.phone_number || anyG.phone || anyG.mobile ||
      anyG.mobilePhone || anyG.cellphone || anyG.cell || anyG.whatsapp || anyG.whatsApp || null;
    if (!cand || typeof cand !== "string") return null;
    return cand.trim();
  }

  function normalizePhoneForWhatsapp(phone: string): string {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.length === 10) return `1${digits}`; // Asumir US si 10 dígitos
    return digits; // Si ya viene con país u otra longitud
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

    setPropertyColors((prev) =>
      assignColorsForIds(prev, uniquePropertyIds, VIBRANT_COLORS, FALLBACK_COLORS),
    );
  }, [shifts]);

  // Asignar colores vivos a guardias primero, luego fallback
  React.useEffect(() => {
    const uniqueGuardIds = Array.from(
      new Set(
        shifts
          .map((s) => s.guard)
          .filter((id): id is number => id != null)
          .map((id) => Number(id))
      )
    );
    if (uniqueGuardIds.length === 0) return;
    setGuardColors((prev) =>
      assignColorsForIds(prev, uniqueGuardIds, VIBRANT_COLORS, FALLBACK_COLORS),
    );
  }, [shifts]);

  // Cargar shifts (primera página o cuando se abre)
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function fetchHierarchicalData() {
      setLoading(true);
      try {
        // 0. Cargar datos básicos de la propiedad actual
        //console.log(`🔄 Cargando datos de la propiedad ${propertyId}...`);
        try {
          const propertyData = await getProperty(propertyId);
          if (mounted) {
            setCurrentPropertyCache(propertyData);
            //console.log(`✅ Datos de la propiedad cargados:`, propertyData.name);
          }
        } catch (error) {
          //console.warn("⚠️ Error cargando datos de la propiedad:", error);
        }
        
        // 1. Cargar servicios de la propiedad primero
        //console.log(`🔄 Cargando servicios para propiedad ${propertyId}...`);
        const servicesResponse = await listServicesByProperty(propertyId);
        const servicesData = Array.isArray(servicesResponse) 
          ? servicesResponse 
          : (servicesResponse as any)?.results || 
            (servicesResponse as any)?.items || 
            (servicesResponse as any)?.data || [];
        
        if (!mounted) return;
        //console.log(`✅ Cargados ${servicesData.length} servicios:`, servicesData.map((s: Service) => s.name));
        setAllServicesCache(servicesData);
        setServicesCacheLoaded(true);
        
        // 2. Cargar turnos de todos los servicios de la propiedad
        //console.log("🔄 Cargando turnos de los servicios...");
        const allShifts: Shift[] = [];
        
        // Primero cargar turnos directos de la propiedad (sin servicio específico)
        const propertyShiftsResponse = await listShiftsByProperty(propertyId, 1, 100, "-start_time");
        const propertyShifts = normalizeShiftsArray(propertyShiftsResponse);
        allShifts.push(...propertyShifts);
        //console.log(`✅ Cargados ${propertyShifts.length} turnos directos de la propiedad`);
        
        // Luego cargar turnos específicos de cada servicio
        const serviceShiftPromises = servicesData.map(async (service: Service) => {
          try {
            const serviceShiftsResponse = await listShiftsByService(service.id);
            const serviceShifts = normalizeShiftsArray(serviceShiftsResponse);
            //console.log(`✅ Servicio ${service.name}: ${serviceShifts.length} turnos`);
            return serviceShifts;
          } catch (error) {
            //console.warn(`⚠️ Error cargando turnos del servicio ${service.name}:`, error);
            return [];
          }
        });
        
        const serviceShiftsResults = await Promise.all(serviceShiftPromises);
        serviceShiftsResults.forEach(shifts => allShifts.push(...shifts));
        
        if (!mounted) return;
        
        // Eliminar duplicados basados en ID
        const uniqueShifts = allShifts.filter((shift, index, self) => 
          index === self.findIndex(s => s.id === shift.id)
        );
        
        //console.log(`✅ Total de turnos únicos cargados: ${uniqueShifts.length}`);
        setShifts(uniqueShifts);

        // 3. Cargar guardias de todos los turnos cargados
        //console.log("🔄 Identificando guardias únicos de los turnos...");
        const uniqueGuardIds = Array.from(
          new Set(
            uniqueShifts
              .map(shift => shift.guard)
              .filter((id): id is number => id != null)
              .map(id => Number(id))
          )
        ).filter(id => !Number.isNaN(id));
        
        //console.log(`🔄 Cargando datos de ${uniqueGuardIds.length} guardias únicos...`);
        
        // Cargar solo los guardias que aparecen en los turnos (más eficiente)
        if (uniqueGuardIds.length > 0) {
          try {
            // Cargar todos los guardias disponibles primero (para tener el cache completo)
            const allGuardsResponse = await listGuards(1, undefined, 200); // Aumentar límite
            const allGuardsData = allGuardsResponse.items || [];
            
            // Filtrar solo los guardias que tienen turnos en esta propiedad
            const relevantGuards = allGuardsData.filter(guard => 
              uniqueGuardIds.includes(guard.id)
            );
            
            if (!mounted) return;
            
            //console.log(`✅ Cargados datos de ${relevantGuards.length} guardias relevantes`);
            setAllGuardsCache(relevantGuards);
            setGuardsCacheLoaded(true);
          } catch (error) {
            //console.error("❌ Error cargando guardias:", error);
            setGuardsCacheLoaded(true); // Marcar como cargado aunque falle
          }
        } else {
          //console.log("ℹ️ No hay guardias para cargar");
          setAllGuardsCache([]);
          setGuardsCacheLoaded(true);
        }

        // 4. Cargar propiedades faltantes
        const propIds = Array.from(
          new Set(
            uniqueShifts
              .map((s) => s.property)
              .filter((id) => id != null)
              .map((id) => Number(id))
          )
        ).filter((id) => !Number.isNaN(id) && propertyMap[id] === undefined);

        if (propIds.length > 0) {
          //console.log(`🔄 Cargando ${propIds.length} propiedades faltantes...`);
          await fetchAndCacheProperties(propIds);
        }

        //console.log("🎉 Carga jerárquica completada exitosamente");
      } catch (err) {
        //console.error("❌ Error en carga jerárquica:", err);
        toast.error(
          TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts data"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchHierarchicalData();

    return () => {
      mounted = false;
    };
  }, [open, propertyId]);

  // NOTA: Los useEffect previos para cargar caches por separado han sido eliminados
  // ya que ahora se cargan de manera jerárquica en el useEffect principal

  // Función para refrescar/actualizar datos (no duplicar)
  async function refresh() {
    setLoading(true);
    try {
      const res = await listShiftsByProperty(propertyId, 1, 100, "-start_time");
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
      //console.error("[Refresh] error:", err);
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

    // Si el nuevo shift trae guard_details en raw, actualizar el cache de guardias
    const guardId = s.guard != null ? Number(s.guard) : undefined;
    if (guardId && raw?.guard_details) {
      const guardData = raw.guard_details;
      // Verificar si ya tenemos este guardia en el cache
      const existingGuard = allGuardsCache.find(g => g.id === guardId);
      if (!existingGuard) {
        // Agregar el nuevo guardia al cache
        const newGuard: Guard = {
          id: guardData.id || guardId,
          firstName: guardData.first_name || guardData.firstName || "",
          lastName: guardData.last_name || guardData.lastName || "",
          email: guardData.email || "",
          phone: guardData.phone || "",
          ssn: guardData.ssn || "",
          address: guardData.address || "",
          birthdate: guardData.birth_date || guardData.birthdate || null,
        };
        
        setAllGuardsCache((prev) => [...prev, newGuard]);
      } else {
        // Actualizar la información del guardia existente si es necesario
        const updatedGuard: Guard = {
          ...existingGuard,
          firstName: guardData.first_name || guardData.firstName || existingGuard.firstName,
          lastName: guardData.last_name || guardData.lastName || existingGuard.lastName,
          email: guardData.email || existingGuard.email,
          phone: guardData.phone || existingGuard.phone,
          ssn: guardData.ssn || existingGuard.ssn,
          address: guardData.address || existingGuard.address,
          birthdate: guardData.birth_date || guardData.birthdate || existingGuard.birthdate,
        };
        
        setAllGuardsCache((prev) => prev.map(g => g.id === guardId ? updatedGuard : g));
      }
    }

    // Si hay un día seleccionado y el turno tiene un guardia, 
    // no cambiar la selección actual para mantener el timeline visible
    // Esto permite que el usuario vea inmediatamente el turno creado por drag & drop
    const newShiftGuardId = s.guard ? Number(s.guard) : null;
    if (selectedDate && newShiftGuardId) {
      // Verificar si el turno creado es para el día seleccionado
      const shiftDate = s.startTime ? new Date(s.startTime) : null;
      if (shiftDate && isSameDay(shiftDate, selectedDate)) {
        // Mantener la fecha seleccionada para que el timeline siga visible
        // El timeline ya mostrará el nuevo turno automáticamente
      }
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

    // Si el shift actualizado trae guard_details en raw, actualizar el cache de guardias
    const guardId = s.guard != null ? Number(s.guard) : undefined;
    if (guardId && raw?.guard_details) {
      const guardData = raw.guard_details;
      // Verificar si ya tenemos este guardia en el cache
      const existingGuard = allGuardsCache.find(g => g.id === guardId);
      if (!existingGuard) {
        // Agregar el nuevo guardia al cache
        const newGuard: Guard = {
          id: guardData.id || guardId,
          firstName: guardData.first_name || guardData.firstName || "",
          lastName: guardData.last_name || guardData.lastName || "",
          email: guardData.email || "",
          phone: guardData.phone || "",
          ssn: guardData.ssn || "",
          address: guardData.address || "",
          birthdate: guardData.birth_date || guardData.birthdate || null,
        };
        
        setAllGuardsCache((prev) => [...prev, newGuard]);
      } else {
        // Actualizar la información del guardia existente
        const updatedGuard: Guard = {
          ...existingGuard,
          firstName: guardData.first_name || guardData.firstName || existingGuard.firstName,
          lastName: guardData.last_name || guardData.lastName || existingGuard.lastName,
          email: guardData.email || existingGuard.email,
          phone: guardData.phone || existingGuard.phone,
          ssn: guardData.ssn || existingGuard.ssn,
          address: guardData.address || existingGuard.address,
          birthdate: guardData.birth_date || guardData.birthdate || existingGuard.birthdate,
        };
        
        setAllGuardsCache((prev) => prev.map(g => g.id === guardId ? updatedGuard : g));
      }
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
  const [createShiftPreselectedProperty, setCreateShiftPreselectedProperty] = React.useState<AppProperty | null>(null);
  
  // Estado para guardia preseleccionado en crear turno
  const [createShiftGuardId, setCreateShiftGuardId] = React.useState<number | null>(null);
  const [createShiftPreselectedGuard, setCreateShiftPreselectedGuard] = React.useState<Guard | null>(null);
  
  // Estado para servicio preseleccionado en crear turno
  const [createShiftPreselectedService, setCreateShiftPreselectedService] = React.useState<Service | null>(null);

  // === Resize (drag) state for timeline ===
  const timelineRef = React.useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = React.useState<
    | {
        id: number;
        mode: "start" | "end" | "move";
        startMs: number;
        endMs: number;
        startClientY: number;
        activated: boolean; // true once movement threshold is crossed (for move), always true for resize
      }
    | null
  >(null);
  const [draftTimes, setDraftTimes] = React.useState<Record<number, { startMs: number; endMs: number }>>({});
  // Drag & Drop state for creating shifts from guard list
  const [isDragOverTimeline, setIsDragOverTimeline] = React.useState<boolean>(false);
  const [dndPreviewLabel, setDndPreviewLabel] = React.useState<string | null>(null);

  const STEP_MINUTES = 15;
  const MIN_DURATION_MIN = 15;

  function roundToStepWithinDay(targetMs: number, sod: number): number {
    const minutesFromSod = Math.round((targetMs - sod) / 60000);
    const snapped = Math.round(minutesFromSod / STEP_MINUTES) * STEP_MINUTES;
    return sod + snapped * 60000;
  }

  const startResize = React.useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      shiftId: number,
      mode: "start" | "end",
      startMs: number,
      endMs: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDragState({ id: shiftId, mode, startMs, endMs, startClientY: e.clientY, activated: true });
      // Prime draft with current values so live render uses it immediately
      setDraftTimes((prev) => ({ ...prev, [shiftId]: { startMs, endMs } }));
      // Disable text selection during drag
      document.body.style.userSelect = "none";
    },
    []
  );

  // Start moving the whole shift keeping its duration
  const startMove = React.useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      shiftId: number,
      startMs: number,
      endMs: number
    ) => {
      // Ignore drags starting from interactive elements
      const target = e.target as HTMLElement | null;
      if (target && target.closest && target.closest("button, a, [data-no-drag]") ) {
        return;
      }
      e.preventDefault();
      // Don't open edit immediately; wait to see if it's a drag vs click
      setDragState({ id: shiftId, mode: "move", startMs, endMs, startClientY: e.clientY, activated: false });
    },
    []
  );

  React.useEffect(() => {
    if (!dragState) return;

  const handleMove = (ev: MouseEvent) => {
      const container = timelineRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pxPerMinute = rect.height / (24 * 60);
      const deltaY = ev.clientY - dragState.startClientY;
      const deltaMinutes = deltaY / pxPerMinute;

      const sodDate = selectedDate
        ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
        : null;
      if (!sodDate) return;
      const sod = sodDate.getTime();
      const eod = sod + 24 * 60 * 60 * 1000;

      let newStart = dragState.startMs;
      let newEnd = dragState.endMs;
      if (dragState.mode === "start") {
        newStart = roundToStepWithinDay(dragState.startMs + deltaMinutes * 60000, sod);
        // Clamp within day and min duration
        newStart = Math.max(sod, Math.min(newStart, newEnd - MIN_DURATION_MIN * 60000));
      } else if (dragState.mode === "end") {
        newEnd = roundToStepWithinDay(dragState.endMs + deltaMinutes * 60000, sod);
        newEnd = Math.min(eod, Math.max(newEnd, newStart + MIN_DURATION_MIN * 60000));
      } else if (dragState.mode === "move") {
        // Activate on threshold to differentiate from click
        if (!dragState.activated) {
          if (Math.abs(ev.clientY - dragState.startClientY) < 3) {
            return; // not yet a drag
          }
          // Mark activated and disable selection
          setDragState((prev) => (prev ? { ...prev, activated: true } : prev));
          document.body.style.userSelect = "none";
        }
  const duration = dragState.endMs - dragState.startMs;
  const rawCandidateStart = dragState.startMs + deltaMinutes * 60000;
  // Snap to a global 15-minute grid; allow start before/after the current day
  const stepMs = STEP_MINUTES * 60000;
  const snapped = Math.round(rawCandidateStart / stepMs) * stepMs;
  newStart = snapped;
  newEnd = newStart + duration;
      }

      setDraftTimes((prev) => ({ ...prev, [dragState.id]: { startMs: newStart, endMs: newEnd } }));
    };

    const handleUp = async () => {
      const dt = draftTimes[dragState.id];
      document.body.style.userSelect = "";
      setDragState(null);
  // If it was a move but never activated, treat as click (don't persist here)
      if (dragState.mode === "move" && !dragState.activated) {
        return;
      }
      if (!dt) return;
  try {
        // Persist changes
        const updated = await updateShift(dragState.id, {
          start_time: new Date(dt.startMs).toISOString(),
          end_time: new Date(dt.endMs).toISOString(),
        });
        // Use existing handler to update state and close any dialogs if needed
        handleUpdated(updated);
      } catch (err) {
        console.error("updateShift failed:", err);
        toast.error("No se pudo actualizar el turno");
      } finally {
        // Clear draft for this shift
        setDraftTimes((prev) => {
          const { [dragState.id]: _, ...rest } = prev;
          return rest;
        });
      }
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, draftTimes, selectedDate]);

  // === Drag & Drop: create a default 12:00–18:00 shift when dropping a guard on the timeline ===
  const handleGuardDragStart = React.useCallback((e: React.DragEvent<HTMLDivElement>, guardId: number) => {
    try {
      e.dataTransfer.setData("text/plain", String(guardId));
      // Also set JSON for robustness
      e.dataTransfer.setData("application/json", JSON.stringify({ guardId }));
    } catch {}
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleTimelineDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Allow drop only when a date is selected
    if (!selectedDate) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOverTimeline) setIsDragOverTimeline(true);
    // Build a preview label based on cursor time
    const container = timelineRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const relY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      const minutes = (relY / rect.height) * 24 * 60;
      const snappedMin = Math.round(minutes / STEP_MINUTES) * STEP_MINUTES;
      const sod = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const startMs = sod.getTime() + snappedMin * 60000;
      const endMs = startMs + 6 * 60 * 60 * 1000; // default 6h
      const startLbl = new Date(startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endLbl = new Date(endMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setDndPreviewLabel(`${startLbl} – ${endLbl}`);
    }
  }, [selectedDate, isDragOverTimeline, STEP_MINUTES]);

  const handleTimelineDragLeave = React.useCallback(() => {
    if (isDragOverTimeline) setIsDragOverTimeline(false);
    setDndPreviewLabel(null);
  }, [isDragOverTimeline]);

  const handleTimelineDrop = React.useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    if (!selectedDate) return;
    e.preventDefault();
  setIsDragOverTimeline(false);
  setDndPreviewLabel(null);

    let guardIdStr = e.dataTransfer.getData("text/plain");
    if (!guardIdStr) {
      try {
        const json = e.dataTransfer.getData("application/json");
        if (json) guardIdStr = String((JSON.parse(json) || {}).guardId ?? "");
      } catch {}
    }
    const guardId = Number(guardIdStr);
    if (!guardId || Number.isNaN(guardId)) {
      toast.error("No se pudo identificar el guardia");
      return;
    }

    try {
      // Compute start based on drop Y position (snap to 15m), default duration 6h
      const container = timelineRef.current;
      let startLocal: Date;
      if (container) {
        const rect = container.getBoundingClientRect();
        const relY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        const minutes = (relY / rect.height) * 24 * 60;
        const snappedMin = Math.round(minutes / STEP_MINUTES) * STEP_MINUTES;
        startLocal = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          0,
          0,
          0,
          0
        );
        startLocal = new Date(startLocal.getTime() + snappedMin * 60000);
      } else {
        startLocal = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          12,
          0,
          0,
          0
        );
      }
      const endLocal = new Date(startLocal.getTime() + 6 * 60 * 60 * 1000);

      // Incluir servicio seleccionado si hay uno
      const shiftData: any = {
        guard: guardId,
        property: propertyId,
        start_time: startLocal.toISOString(),
        end_time: endLocal.toISOString(),
        status: "scheduled",
      };
      
      // Si hay un servicio seleccionado, incluirlo en el turno
      if (selectedServiceId !== null) {
        shiftData.service = selectedServiceId;
      }

      const created = await createShift(shiftData);
      handleCreated(created);
      
      // Actualizar timeline para mostrar el guardia que acabamos de agregar
      // Si hay un guardia seleccionado diferente, cambiarlo al que acabamos de crear el turno
      if (selectedGuardId !== guardId) {
        setSelectedGuardId(guardId);
        // Mantener la fecha seleccionada para mostrar el timeline
        // No limpiar selectedDate para que siga mostrando el timeline del día
      }
    } catch (err) {
      console.error("createShift (DnD) failed:", err);
      toast.error("No se pudo crear el turno");
    }
  }, [selectedDate, propertyId, selectedServiceId, selectedGuardId]);
  
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
                {propertyName
                  ? `${TEXT?.shifts?.show?.title ?? "Turnos"} | ${propertyName}`
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
                
                {/* Selector de servicios */}
                {servicesCacheLoaded && allServicesCache.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Servicio:</span>
                    <Select
                      value={selectedServiceId?.toString() || "all"}
                      onValueChange={(value) => {
                        setSelectedServiceId(value === "all" ? null : Number(value));
                      }}
                    >
                      <SelectTrigger className="h-6 w-[200px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los servicios</SelectItem>
                        {allServicesCache.map((service) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{service.name}</span>
                              {service.startTime && service.endTime && (
                                <span className="text-muted-foreground text-xs">
                                  ({service.startTime} - {service.endTime})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <span className="text-xs bg-muted/50 px-2 py-1 rounded">
                  <BarChart3 className="h-3 w-3 inline mr-1" />
                  {statistics.total} turnos • {statistics.totalHours}h total
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
                  setCreateShiftPropertyId(propertyId); // Preseleccionar la propiedad actual
                  setCreateShiftPreselectedProperty(currentPropertyCache); // Preseleccionar la propiedad actual
                  // Preseleccionar servicio si hay uno seleccionado en el modal
                  if (selectedServiceId !== null) {
                    const svc = allServicesCache.find(s => s.id === selectedServiceId) || null;
                    setCreateShiftPreselectedService(svc);
                  } else {
                    setCreateShiftPreselectedService(null);
                  }
                  setOpenCreate(true);
                }}
                className="h-8"
                disabled={!servicesCacheLoaded}
              >
                <Plus className="h-3 w-3 mr-1" />
                {!servicesCacheLoaded ? "Cargando..." : (TEXT?.shifts?.create?.title ?? "Crear")}
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
                            disabled={disabledDays}
                            locale={localeEs}
                            fromMonth={fromMonth}
                            toMonth={toMonth}
                            className="w-full"
                            style={{
                              transform: 'scale(1.0)',
                              transformOrigin: 'center'
                            }}
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
                                const dateKey = normalizeDateKey(props.day.date);
                                const guards = dateGuardMap[dateKey] || [];
                                const hasShifts = guards.length > 0;
                                
                                // Verificar si este día tiene solapamientos
                                const hasOverlap = overlapDays.has(normalizeDateKey(props.day.date));
                                // Verificar si este día tiene gaps
                                const hasGap = gapDetection.gapDays.has(normalizeDateKey(props.day.date));
                                
                                // Verificar si este día tiene turnos del guardia seleccionado
                                const hasSelectedGuardShift = selectedGuardId ? 
                                  guards.some(g => g.guardId === selectedGuardId) : false;
                                
                                // Color del guardia seleccionado para el sombreado
                                const selectedGuardColor = selectedGuardId ?
                                  (guardColors[selectedGuardId] || VIBRANT_COLORS[selectedGuardId % VIBRANT_COLORS.length] || FALLBACK_COLORS[selectedGuardId % FALLBACK_COLORS.length]) : null;                                return (
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
                                      hasShifts && !props.modifiers?.selected && !hasSelectedGuardShift && !hasOverlap && "shadow-sm bg-blue-50/60 border border-blue-100/80",
                                      // Sombreado del color de la propiedad seleccionada - solo si no hay solapamiento
                                      hasSelectedGuardShift && !props.modifiers?.selected && !hasOverlap && "shadow-md border-2",
                                      props.className
                                    )}
                                    style={{
                                      ...props.style,
                                      // Aplicar color de fondo y borde cuando hay propiedad seleccionada
                                      ...(hasSelectedGuardShift && selectedGuardColor && !props.modifiers?.selected && {
                                        backgroundColor: `${selectedGuardColor}15`, // 15 es ~8% opacity en hex
                                        borderColor: `${selectedGuardColor}80`, // 80 es ~50% opacity en hex
                                        boxShadow: `0 2px 4px ${selectedGuardColor}25` // 25 es ~15% opacity en hex
                                      })
                                    }}
                                  >
                                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                                      {/* Indicador de gap */}
                                      {hasGap && (
                                        <div className="absolute top-1 right-1" title="Día con gaps de cobertura">
                                          <AlertTriangle className="h-3 w-3 text-orange-500 drop-shadow" />
                                        </div>
                                      )}
                                      {/* Número del día */}
                                      <span className={cn(
                                        "text-sm",
                                        hasShifts && "font-semibold"
                                      )}>
                                        {props.day.date.getDate()}
                                      </span>
                                      
                                      {/* Círculos de guardias en la parte inferior */}
                                      {guards.length > 0 && (
                                        <div className="absolute bottom-0.5 flex justify-center gap-0.5 flex-wrap max-w-full">
                                          {guards.slice(0, guards.length > 3 ? 3 : guards.length).map((guard, idx) => (
                                            <div
                                              key={`${guard.guardId}-${idx}`}
                                              className={cn(
                                                "w-1.5 h-1.5 rounded-full border transition-all duration-200",
                                                selectedGuardId === guard.guardId 
                                                  ? "border-white/90 shadow-sm ring-1 ring-white/30 scale-110" 
                                                  : "border-white/30"
                                              )}
                                              style={{ backgroundColor: guard.color }}
                                              title={`Guardia ${guard.guardId}${guard.shiftCount > 1 ? ` (${guard.shiftCount} turnos)` : ''}`}
                                            />
                                          ))}
                                          {guards.length > 3 && (
                                            <div 
                                              className="w-1.5 h-1.5 rounded-full bg-gray-500 border border-white/30 flex items-center justify-center shadow-sm"
                                              title={`+${guards.length - 3} más guardias`}
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

                        {/* Alerta de solapamientos (solo cuando el mismo guardia se solapa) */}
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
                          <User className="h-4 w-4" />
                          Guardias ({allGuards.length})
                        </CardTitle>
                        
                        <div className="flex items-center gap-2">
                          {/* Botón de limpiar filtros cuando hay filtros activos */}
                          {(selectedPropertyId || guardTimeFilter !== "all" || guardSearchQuery.trim()) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPropertyId(null);
                                setGuardTimeFilter("all");
                                setGuardSearchQuery("");
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              <Filter className="h-3 w-3 mr-1" />
                              Limpiar
                            </Button>
                          )}
                          
                          {/* Dropdown de filtros temporales */}
                          <Select value={guardTimeFilter} onValueChange={setGuardTimeFilter}>
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
                            placeholder="Buscar guardia por nombre..."
                            value={guardSearchQuery}
                            onChange={(e) => setGuardSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-sm"
                          />
                          {guardSearchQuery && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setGuardSearchQuery("")}
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
                          {!guardsCacheLoaded ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cargando guardias...
                              </div>
                            </div>
                          ) : allGuards.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              {guardSearchQuery.trim() ? 
                                "No se encontraron guardias" : 
                                guardTimeFilter === 'no-shifts' ? 
                                  "No hay guardias sin turnos" :
                                  "No hay guardias con turnos en esta propiedad"
                              }
                            </div>
                          ) : (
              allGuards.map((guardData) => {
                              const hasGuardOverlap = overlapGuards.has(guardData.guard.id);
                              
                              return (
                              <div
                                key={guardData.guard.id}
                                className={cn(
                                  "p-2 rounded border transition-all hover:shadow-sm",
                                  // Estilo para solapamiento (prioridad alta)
                                  hasGuardOverlap 
                                    ? "border-red-400 bg-red-50 shadow-md ring-2 ring-red-200" 
                                    : selectedGuardId === guardData.guard.id
                                      ? "border-primary bg-primary/10 shadow-sm"
                                      : "border-transparent bg-muted/50 hover:bg-muted"
                                )}
                draggable
                onDragStart={(e) => handleGuardDragStart(e, guardData.guard.id)}
                title="Arrastra al timeline para crear turno 12:00–18:00"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  {/* Indicador de solapamiento */}
                                  {hasGuardOverlap && (
                                    <div className="flex-shrink-0 mt-1">
                                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Guardia con solapamientos" />
                                    </div>
                                  )}
                                  
                                  {/* Contenido principal del guardia */}
                                  <div 
                                    className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                      setSelectedGuardId(
                                        selectedGuardId === guardData.guard.id 
                                          ? null 
                                          : guardData.guard.id
                                      );
                                      // Limpiar selección de fecha al seleccionar guardia
                                      setSelectedDate(undefined);
                                    }}
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 border border-white shadow-sm"
                                      style={{ backgroundColor: guardData.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="font-medium text-xs truncate">
                                          {guardData.guard.firstName} {guardData.guard.lastName}
                                        </div>
                                        {(() => {
                                          const rawPhone = getGuardPhone(guardData.guard);
                                          if (!rawPhone) return null;
                                          const wa = normalizePhoneForWhatsapp(rawPhone);
                                          return (
                                            <a
                                              href={`https://wa.me/${wa}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs inline-flex items-center gap-1 underline decoration-dotted text-green-700 hover:text-primary"
                                              title={`WhatsApp a ${rawPhone}`}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MessageCircle className="h-3 w-3" /> {rawPhone}
                                            </a>
                                          );
                                        })()}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <CalendarIcon className="h-3 w-3" />
                                          {guardData.shifts.length}
                                        </span>
                                        {guardData.totalHours > 0 && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {guardData.totalHours}h
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Siguiente turno */}
                                      {guardData.shifts.length > 0 && (
                                        <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                                          {(() => {
                                            const now = new Date();
                                            const nextShift = guardData.shifts
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
                                      e.stopPropagation(); // Evitar que se active el click del guardia
                                      setCreateShiftGuardId(guardData.guard.id);
                                      setCreateShiftPreselectedGuard(guardData.guard);
                                      // Preseleccionar la propiedad del modal
                                      setCreateShiftPropertyId(propertyId);
                                      setCreateShiftPreselectedProperty(currentPropertyCache);
                                      // Preseleccionar servicio si hay uno seleccionado en el modal
                                      if (selectedServiceId !== null) {
                                        const svc = allServicesCache.find(s => s.id === selectedServiceId) || null;
                                        setCreateShiftPreselectedService(svc);
                                      } else {
                                        setCreateShiftPreselectedService(null);
                                      }
                                      setOpenCreate(true);
                                    }}
                                    className="h-6 w-6 p-0 flex-shrink-0 hover:bg-primary/10 hover:text-primary"
                                    title={`Crear turno para ${guardData.guard.firstName} ${guardData.guard.lastName}`}
                                    disabled={!guardsCacheLoaded}
                                  >
                                    {!guardsCacheLoaded ? (
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
                          : selectedGuardId
                            ? `Turnos - ${allGuards.find((g: GuardWithShifts) => g.guard.id === selectedGuardId)?.guard.firstName || 'Guardia'} ${allGuards.find((g: GuardWithShifts) => g.guard.id === selectedGuardId)?.guard.lastName || ''}`
                            : selectedPropertyId
                              ? `Turnos - ${allProperties.find((p: PropertyWithShifts) => p.property.id === selectedPropertyId)?.property.name || 'Propiedad'}`
                              : `Todos los Turnos (${filteredShifts.length})`
                        }
                      </CardTitle>
                      <div className="text-xs text-muted-foreground">
                        {selectedDate 
                          ? "Propiedades del día seleccionado"
                          : selectedGuardId
                            ? "Turnos del guardia seleccionado"
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
                            {/* Fondos alternos por hora (gris claro / azul claro) */}
                            {Array.from({ length: 24 }, (_, h) => {
                              const top = (h / 24) * 100;
                              const height = (1 / 24) * 100;
                              const isEven = h % 2 === 0;
                              return (
                                <div
                                  key={`bg-${h}`}
                                  className="absolute left-0 right-0 z-0 pointer-events-none"
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
                                  {dndPreviewLabel ? `Suelta para crear ${dndPreviewLabel}` : 'Suelta para crear turno'}
                                </div>
                              </div>
                            )}

                            {Array.from({ length: 25 }, (_, h) => {
                              const top = (h / 24) * 100;
                              const showLabel = h % 2 === 0; // etiqueta cada 2 horas
                              return (
                                <div key={h}>
              <div className="absolute left-0 right-0 border-t border-muted/30 z-30 pointer-events-none" style={{ top: `${top}%` }} />
                                  {showLabel && (
                                    <div
                                      className={cn(
                "absolute left-1 text-[10px] text-muted-foreground bg-background/80 px-1 rounded z-30 pointer-events-none",
                                        h === 0 ? "translate-y-0" : h === 24 ? "-translate-y-full" : "-translate-y-1/2"
                                      )}
                                      style={{ top: `${top}%` }}
                                    >
                                      {h.toString().padStart(2, '0')}:00
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Franja naranja para horario del servicio seleccionado */}
                            {selectedServiceId !== null && (() => {
                              const selectedService = allServicesCache.find(s => s.id === selectedServiceId);
                              if (!selectedService || !selectedService.startTime || !selectedService.endTime) return null;

                              // Parsear horarios del servicio
                              const parseTime = (timeStr: string) => {
                                const parts = timeStr.split(':');
                                const hours = parseInt(parts[0], 10) || 0;
                                const minutes = parseInt(parts[1], 10) || 0;
                                return { hours, minutes };
                              };

                              const startTimeObj = parseTime(selectedService.startTime);
                              const endTimeObj = parseTime(selectedService.endTime);

                              // Calcular posición y altura en el timeline
                              const startMinutes = startTimeObj.hours * 60 + startTimeObj.minutes;
                              let endMinutes = endTimeObj.hours * 60 + endTimeObj.minutes;
                              
                              // Manejar servicios que cruzan medianoche
                              if (endMinutes <= startMinutes) {
                                endMinutes += 24 * 60; // Agregar 24 horas
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
                                    height: `${Math.max(heightPct, 2)}%`, // Mínimo 2% de altura para visibilidad
                                    backgroundColor: "rgba(249, 115, 22, 0.15)", // naranja con opacidad mejorada
                                    border: "1px solid rgba(245, 158, 11, 0.4)",
                                  }}
                                  title={`Horario del servicio: ${selectedService.name} (${selectedService.startTime} - ${selectedService.endTime})`}
                                >
                                  <div className="absolute left-1 top-1 text-[10px] text-orange-800 bg-orange-100/95 px-1.5 py-0.5 rounded-sm font-medium shadow-sm">
                                    📋 {selectedService.name}
                                  </div>
                                  <div className="absolute right-1 top-1 text-[9px] text-orange-700 bg-orange-50/90 px-1 py-0.5 rounded-sm">
                                    {selectedService.startTime} - {selectedService.endTime}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Bloques de gaps (fondo) */}
                            {(() => {
                              const dk = selectedDate.toLocaleDateString();
                              const gaps = gapDetection.gapsMap[dk] || [];
          return gaps.map((g, idx) => {
                                const sod = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
                                const minutesFromStart = (g.start - sod) / 60000;
                                const durationMinutes = (g.end - g.start) / 60000;
                                const topPct = (minutesFromStart / (24 * 60)) * 100;
                                const heightPct = (durationMinutes / (24 * 60)) * 100;
                                return (
                                  <div
                                    key={`gap-${idx}`}
            className="absolute left-10 right-2 rounded-sm z-10"
                                    style={{
                                      top: `${topPct}%`,
                                      height: `${heightPct}%`,
                                      backgroundColor: "#F97316" + "2A", // naranja con baja opacidad
                                      outline: "1px dashed #F59E0B",
                                    }}
                                    title="Gap de cobertura"
                                  />
                                );
                              });
                            })()}

                            {/* Bloques de turnos posicionados por hora con distribución por carriles (lanes) */}
                            {(() => {
                              const sod = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
                              const eod = sod + 24 * 60 * 60 * 1000;

                              type Item = {
                                shift: Shift;
                                guardId: number;
                                guardName: string;
                                color: string;
                                rawPhone: string | null;
                                wa: string | null;
                                startMs: number;
                                endMs: number;
                                clampedStart: number;
                                clampedEnd: number;
                                crossesFromPrev: boolean;
                                crossesToNext: boolean;
                                topPct: number;
                                heightPct: number;
                              };

                              // Preparar items del día - filtrar por servicio si está seleccionado
                              const items: Item[] = shifts
                                .filter((shift) => {
                                  // Usar planned_start_time si start_time es null
                                  const startTimeStr = shift.startTime || shift.plannedStartTime;
                                  if (!startTimeStr) return false;
                                  
                                  const st = new Date(startTimeStr).getTime();
                                  const endTimeStr = shift.endTime || shift.plannedEndTime;
                                  const et = endTimeStr ? new Date(endTimeStr).getTime() : st + 60 * 60 * 1000;
                                  
                                  // Filtrar por día
                                  const overlapsWithDay = st < eod && et > sod;
                                  if (!overlapsWithDay) return false;
                                  
                                  // Filtrar por servicio si hay uno seleccionado
                                  if (selectedServiceId !== null) {
                                    return shift.service === selectedServiceId;
                                  }
                                  
                                  return true;
                                })
                                .map((shift) => {
                                  const guardId = shift.guard ? Number(shift.guard) : -1;
                                  const guard = allGuardsCache.find((g) => g.id === guardId);
                                  const guardName = guard ? `${guard.firstName} ${guard.lastName}` : (guardId !== -1 ? `Guardia ${guardId}` : "Sin guardia");
                                  const color = guardColors[guardId] || VIBRANT_COLORS[guardId % VIBRANT_COLORS.length] || FALLBACK_COLORS[guardId % FALLBACK_COLORS.length] || "#6B7280";
                                  const rawPhone = getGuardPhone(guard);
                                  const wa = rawPhone ? normalizePhoneForWhatsapp(rawPhone) : null;

                                  // Usar planned times como fallback
                                  const startTimeStr = shift.startTime || shift.plannedStartTime;
                                  const endTimeStr = shift.endTime || shift.plannedEndTime;
                                  let startMs = startTimeStr ? new Date(startTimeStr).getTime() : sod;
                                  let endMs = endTimeStr ? new Date(endTimeStr).getTime() : Math.min(startMs + 60 * 60 * 1000, eod);
                                  
                                  // Apply draft override if dragging this shift
                                  const draft = draftTimes[shift.id];
                                  if (draft) {
                                    startMs = draft.startMs;
                                    endMs = draft.endMs;
                                  }
                                  const clampedStart = Math.max(startMs, sod);
                                  const clampedEnd = Math.min(endMs, eod);
                                  const crossesFromPrev = startMs < sod;
                                  const crossesToNext = endMs > eod;
                                  const minutesFromStart = Math.max(0, (clampedStart - sod) / 60000);
                                  const durationMinutes = Math.max(15, (clampedEnd - clampedStart) / 60000);
                                  const topPct = (minutesFromStart / (24 * 60)) * 100;
                                  const heightPct = (durationMinutes / (24 * 60)) * 100;

                                  return {
                                    shift,
                                    guardId,
                                    guardName,
                                    color,
                                    rawPhone,
                                    wa,
                                    startMs,
                                    endMs,
                                    clampedStart,
                                    clampedEnd,
                                    crossesFromPrev,
                                    crossesToNext,
                                    topPct,
                                    heightPct,
                                  };
                                })
                                .sort((a, b) => a.clampedStart - b.clampedStart || a.clampedEnd - b.clampedEnd);

                              // Construir grafo de solapamientos para obtener componentes (grupos)
                              const n = items.length;
                              const adj: number[][] = Array.from({ length: n }, () => []);
                              for (let i = 0; i < n; i++) {
                                for (let j = i + 1; j < n; j++) {
                                  if (items[i].clampedStart < items[j].clampedEnd && items[j].clampedStart < items[i].clampedEnd) {
                                    adj[i].push(j);
                                    adj[j].push(i);
                                  }
                                }
                              }

                              // DFS para componentes conectados
                              const visited = new Array(n).fill(false);
                              const components: number[][] = [];
                              for (let i = 0; i < n; i++) {
                                if (visited[i]) continue;
                                const stack = [i];
                                visited[i] = true;
                                const comp: number[] = [];
                                while (stack.length) {
                                  const u = stack.pop()!;
                                  comp.push(u);
                                  adj[u].forEach((v) => {
                                    if (!visited[v]) {
                                      visited[v] = true;
                                      stack.push(v);
                                    }
                                  });
                                }
                                components.push(comp);
                              }

                              // Asignar carriles por componente (greedy)
                              const laneMap = new Map<number, { laneIndex: number; laneCount: number }>();
                              components.forEach((comp) => {
                                const sorted = comp.sort((a, b) => items[a].clampedStart - items[b].clampedStart || items[a].clampedEnd - items[b].clampedEnd);
                                const laneEnds: number[] = [];
                                const assigned: { idx: number; lane: number }[] = [];
                                sorted.forEach((idx) => {
                                  const it = items[idx];
                                  let lane = laneEnds.findIndex((end) => end <= it.clampedStart);
                                  if (lane === -1) {
                                    lane = laneEnds.length;
                                    laneEnds.push(it.clampedEnd);
                                  } else {
                                    laneEnds[lane] = it.clampedEnd;
                                  }
                                  assigned.push({ idx, lane });
                                });
                                const count = laneEnds.length || 1;
                                assigned.forEach(({ idx, lane }) => {
                                  laneMap.set(idx, { laneIndex: lane, laneCount: count });
                                });
                              });

          // Renderizar
                              return items.map((it, idx) => {
                                const laneInfo = laneMap.get(idx) || { laneIndex: 0, laneCount: 1 };
                                const widthPct = 100 / Math.max(1, laneInfo.laneCount);
                                const leftPct = widthPct * laneInfo.laneIndex;
                                const roundingClass = it.crossesFromPrev && it.crossesToNext
                                  ? "rounded-none"
                                  : it.crossesFromPrev
                                    ? "rounded-b-md"
                                    : it.crossesToNext
                                      ? "rounded-t-md"
                                      : "rounded-md";

                                return (
                                  <div
                                    key={it.shift.id}
            className="absolute left-10 right-2 z-20"
                                    style={{ top: `${it.topPct}%`, height: `${it.heightPct}%` }}
                                  >
                                    {/* tarjeta posicionada por carril dentro del contenedor */}
                                    <div
                                      className={cn(
                                        "absolute inset-y-0 shadow-sm text-white text-[10px] leading-tight p-2 select-none hover:ring-2 hover:ring-white/20",
                                        dragState && dragState.id === it.shift.id && dragState.mode === 'move' && dragState.activated ? 'cursor-grabbing' : 'cursor-grab',
                                        roundingClass
                                      )}
                                      style={{
                                        left: `calc(${leftPct}% + ${laneInfo.laneIndex > 0 ? 1 : 0}px)`,
                                        width: `calc(${widthPct}% - ${laneInfo.laneCount > 1 ? 2 : 0}px)`,
                                        backgroundColor: it.color + "E6",
                                        backdropFilter: "blur(0.5px)",
                                      }}
                                      title={`${it.guardName}\n${it.shift.startTime ? new Date(it.shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - ${it.shift.endTime ? new Date(it.shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}
                                      onMouseDown={(e) => startMove(e, it.shift.id, it.startMs, it.endMs)}
                                      onClick={(e) => {
                                        // If we were moving and it activated, suppress click opening edit
                                        if (dragState && dragState.id === it.shift.id && dragState.mode === 'move' && dragState.activated) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          return;
                                        }
                                        setOpenEditId(it.shift.id);
                                      }}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold truncate">{it.guardName}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono">
                                            {it.shift.startTime ? new Date(it.shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                            {" "}–{" "}
                                            {it.shift.endTime ? new Date(it.shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                          </span>
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
                                      </div>
                                      {/* Drag preview time indicator */}
                                      {dragState && dragState.id === it.shift.id && (
                                        (() => {
                                          const dt = draftTimes[it.shift.id];
                                          const ms = dt ? (dragState.mode === 'start' ? dt.startMs : dt.endMs) : null;
                                          if (!ms) return null;
                                          const label = new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                          return (
                                            <div
                                              className={cn(
                                                'absolute left-1 text-[10px] px-1 py-0.5 rounded bg-black/60 text-white',
                                                dragState.mode === 'start' ? 'top-0 -translate-y-full' : 'bottom-0 translate-y-full'
                                              )}
                                            >
                                              {label}
                                            </div>
                                          );
                                        })()
                                      )}
                                      {it.wa && (
                                        <div className="mt-1 text-[10px] leading-none truncate">
                                          <a
                                            href={`https://wa.me/${it.wa}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline decoration-dotted flex items-center gap-1 hover:text-white"
                                            title={`WhatsApp a ${it.rawPhone}`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MessageCircle className="h-3 w-3" /> {it.rawPhone}
                                          </a>
                                        </div>
                                      )}
                                      {/* Resize handles */}
                                      {/* Handles solo cuando el borde corresponde al turno real (no en medianoche si cruza el día) */}
                    {!it.crossesFromPrev && (
                                        <div
                      className="absolute top-0 left-0 right-0 h-6 cursor-ns-resize opacity-80 hover:opacity-100 flex items-center justify-center z-40"
                                          onMouseDown={(e) => startResize(e, it.shift.id, 'start', it.startMs, it.endMs)}
                                          title="Ajustar inicio"
                                        >
                      <MoveVertical className="h-5 w-5" />
                                        </div>
                                      )}
                    {!it.crossesToNext && (
                                        <div
                      className="absolute bottom-0 left-0 right-0 h-6 cursor-ns-resize opacity-80 hover:opacity-100 flex items-center justify-center z-40"
                                          onMouseDown={(e) => startResize(e, it.shift.id, 'end', it.startMs, it.endMs)}
                                          title="Ajustar fin"
                                        >
                      <MoveVertical className="h-5 w-5" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
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
          setCreateShiftPropertyId(propertyId); // Mantener la propiedad preseleccionada
          setCreateShiftPreselectedProperty(currentPropertyCache); // Mantener la propiedad preseleccionada
          setCreateShiftPreselectedService(null); // Limpiar servicio preseleccionado
        }}
        selectedDate={selectedDate}
        propertyId={createShiftPropertyId}
        preselectedProperty={createShiftPreselectedProperty}
        preselectedService={createShiftPreselectedService}
        preloadedProperties={allProperties.map(p => p.property).filter(p => p != null)}
        guardId={createShiftGuardId ?? undefined}
        preloadedGuard={createShiftPreselectedGuard}
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
