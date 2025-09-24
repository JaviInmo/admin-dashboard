// src/components/Properties/properties shifts content/coverageGaps.ts

import type { Shift } from "@/components/Shifts/types";

type ShiftApi = Shift & {
  planned_start_time?: string | null;
  planned_end_time?: string | null;
};

// Función auxiliar para convertir minutos a formato HH:MM
function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Información sobre brechas en la cobertura del servicio
 */
export type CoverageGap = {
  type: 'start' | 'middle' | 'end';
  startTime: string;
  endTime: string;
  description: string;
};

/**
 * Verifica si los turnos cubren completamente el horario del servicio y devuelve información sobre brechas
 */
export function getServiceCoverageGaps(
  shifts: ShiftApi[],
  serviceStartTime: string,
  serviceEndTime: string,
  serviceName: string = ""
): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  if (!shifts || shifts.length === 0) {
    gaps.push({
      type: 'start',
      startTime: serviceStartTime,
      endTime: serviceEndTime,
      description: COVERAGE_TEXTS.fullServiceGap(serviceName, serviceStartTime, serviceEndTime)
    });
    return gaps;
  }

  // Convertir tiempos del servicio a minutos desde medianoche
  const [serviceStartHour, serviceStartMinute] = serviceStartTime.split(':').map(Number);
  const [serviceEndHour, serviceEndMinute] = serviceEndTime.split(':').map(Number);
  
  const serviceStartMinutes = serviceStartHour * 60 + serviceStartMinute;
  const serviceEndMinutes = serviceEndHour * 60 + serviceEndMinute;

  // Determinar si es un servicio nocturno (cruza medianoche)
  const isOvernight = serviceStartMinutes > serviceEndMinutes;

  // Obtener todos los intervalos de tiempo de los turnos
  const shiftIntervals: Array<{ start: number; end: number }> = [];
  
  shifts.forEach(shift => {
    const startIso = shift.plannedStartTime ?? shift.planned_start_time ?? shift.startTime ?? null;
    const endIso = shift.plannedEndTime ?? shift.planned_end_time ?? shift.endTime ?? null;
    
    if (startIso && endIso) {
      const startDate = new Date(startIso);
      const endDate = new Date(endIso);
      
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

      // Si el turno cruza medianoche, dividirlo en dos intervalos
      if (endMinutes < startMinutes) {
        shiftIntervals.push({ start: startMinutes, end: 24 * 60 });
        shiftIntervals.push({ start: 0, end: endMinutes });
      } else {
        shiftIntervals.push({ start: startMinutes, end: endMinutes });
      }
    }
  });

  if (shiftIntervals.length === 0) {
    gaps.push({
      type: 'start',
      startTime: serviceStartTime,
      endTime: serviceEndTime,
      description: COVERAGE_TEXTS.fullServiceGap(serviceName, serviceStartTime, serviceEndTime)
    });
    return gaps;
  }

  // Ordenar intervalos por hora de inicio
  shiftIntervals.sort((a, b) => a.start - b.start);

  // Combinar intervalos superpuestos o adyacentes
  const mergedIntervals: Array<{ start: number; end: number }> = [];
  let current = shiftIntervals[0];
  
  for (let i = 1; i < shiftIntervals.length; i++) {
    if (current.end >= shiftIntervals[i].start) {
      current.end = Math.max(current.end, shiftIntervals[i].end);
    } else {
      mergedIntervals.push(current);
      current = shiftIntervals[i];
    }
  }
  mergedIntervals.push(current);

  // Función para convertir minutos a formato HH:MM
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  if (isOvernight) {
    // Servicio nocturno: verificar cobertura desde start hasta 24:00 y desde 00:00 hasta end
    
    // Verificar brecha al inicio (desde serviceStart hasta el primer turno)
    const firstInterval = mergedIntervals.find(interval => interval.start <= 24 * 60 && interval.end > serviceStartMinutes);
    if (!firstInterval || firstInterval.start > serviceStartMinutes) {
      const gapStart = serviceStartMinutes;
      const gapEnd = firstInterval ? Math.min(firstInterval.start, 24 * 60) : 24 * 60;
      if (gapEnd > gapStart) {
        gaps.push({
          type: 'start',
          startTime: minutesToTime(gapStart),
          endTime: minutesToTime(gapEnd),
          description: COVERAGE_TEXTS.startGap(serviceName, minutesToTime(gapEnd))
        });
      }
    }

    // Verificar brechas internas en la noche
    for (let i = 0; i < mergedIntervals.length - 1; i++) {
      const current = mergedIntervals[i];
      const next = mergedIntervals[i + 1];
      if (current.end < next.start && current.end < 24 * 60 && next.start > 0) {
        const gapStart = Math.max(current.end, serviceStartMinutes);
        const gapEnd = Math.min(next.start, 24 * 60);
        if (gapEnd > gapStart) {
          gaps.push({
            type: 'middle',
            startTime: minutesToTime(gapStart),
            endTime: minutesToTime(gapEnd),
            description: `Falta cubrir entre ${minutesToTime(gapStart)} y ${minutesToTime(gapEnd)}`
          });
        }
      }
    }

    // Verificar brecha al final de la noche (desde último turno hasta 24:00)
    const lastNightInterval = mergedIntervals.find(interval => interval.end >= 24 * 60);
    if (!lastNightInterval || lastNightInterval.end < 24 * 60) {
      const gapStart = lastNightInterval ? lastNightInterval.end : serviceStartMinutes;
      if (gapStart < 24 * 60) {
        gaps.push({
          type: 'end',
          startTime: minutesToTime(gapStart),
          endTime: '24:00',
          description: COVERAGE_TEXTS.endGap(serviceName, minutesToTime(gapStart))
        });
      }
    }

    // Verificar brecha en la madrugada (desde 00:00 hasta serviceEnd)
    const firstMorningInterval = mergedIntervals.find(interval => interval.start <= serviceEndMinutes && interval.end > 0);
    if (!firstMorningInterval || firstMorningInterval.start > 0) {
      const gapStart = 0;
      const gapEnd = firstMorningInterval ? Math.min(firstMorningInterval.start, serviceEndMinutes) : serviceEndMinutes;
      if (gapEnd > gapStart) {
        gaps.push({
          type: 'start',
          startTime: '00:00',
          endTime: minutesToTime(gapEnd),
          description: COVERAGE_TEXTS.overnightStartGap(serviceName, minutesToTime(gapEnd))
        });
      }
    }

    // Verificar brechas internas en la madrugada
    const morningIntervals = mergedIntervals.filter(interval => interval.start < serviceEndMinutes && interval.end > 0);
    for (let i = 0; i < morningIntervals.length - 1; i++) {
      const current = morningIntervals[i];
      const next = morningIntervals[i + 1];
      if (current.end < next.start) {
        const gapStart = Math.max(current.end, 0);
        const gapEnd = Math.min(next.start, serviceEndMinutes);
        if (gapEnd > gapStart) {
          gaps.push({
            type: 'middle',
            startTime: minutesToTime(gapStart),
            endTime: minutesToTime(gapEnd),
            description: COVERAGE_TEXTS.middleGap(serviceName, minutesToTime(gapStart), minutesToTime(gapEnd))
          });
        }
      }
    }

    // Verificar brecha al final de la madrugada
    const lastMorningInterval = morningIntervals[morningIntervals.length - 1];
    if (!lastMorningInterval || lastMorningInterval.end < serviceEndMinutes) {
      const gapStart = lastMorningInterval ? Math.max(lastMorningInterval.end, 0) : 0;
      if (gapStart < serviceEndMinutes) {
        gaps.push({
          type: 'end',
          startTime: minutesToTime(gapStart),
          endTime: serviceEndTime,
          description: COVERAGE_TEXTS.overnightEndGap(serviceName, minutesToTime(gapStart))
        });
      }
    }
  } else {
    // Servicio diurno: verificar brechas simples
    
    // Brecha al inicio
    const firstInterval = mergedIntervals[0];
    if (firstInterval.start > serviceStartMinutes) {
      gaps.push({
        type: 'start',
        startTime: serviceStartTime,
        endTime: minutesToTime(firstInterval.start),
        description: COVERAGE_TEXTS.startGap(serviceName, minutesToTime(firstInterval.start))
      });
    }

    // Brechas internas
    for (let i = 0; i < mergedIntervals.length - 1; i++) {
      const current = mergedIntervals[i];
      const next = mergedIntervals[i + 1];
      if (current.end < next.start) {
        gaps.push({
          type: 'middle',
          startTime: minutesToTime(current.end),
          endTime: minutesToTime(next.start),
          description: COVERAGE_TEXTS.middleGap(serviceName, minutesToTime(current.end), minutesToTime(next.start))
        });
      }
    }

    // Brecha al final
    const lastInterval = mergedIntervals[mergedIntervals.length - 1];
    if (lastInterval.end < serviceEndMinutes) {
      gaps.push({
        type: 'end',
        startTime: minutesToTime(lastInterval.end),
        endTime: serviceEndTime,
        description: COVERAGE_TEXTS.endGap(serviceName, minutesToTime(lastInterval.end))
      });
    }
  }

  return gaps;
}

/**
 * Calcula las brechas de cobertura combinadas para mostrar en el footer
 */
export function getCombinedFooterGaps(
  hoveredDay: Date | null,
  selectedService: { id: number; name: string; startTime: string | null; endTime: string | null; schedule: string[] | null } | null,
  services: Array<{ id: number; name: string; startTime: string | null; endTime: string | null; schedule: string[] | null }>,
  shiftsByGuardAndDate: Map<number, Record<string, ShiftApi[]>>
): string[] | null {
  if (!hoveredDay) return null; // No mostrar nada si no hay día hovered

  const allGaps: string[] = [];

  // Calcular brechas solo para el día hovered
  const key = `${hoveredDay.getFullYear()}-${pad(hoveredDay.getMonth() + 1)}-${pad(hoveredDay.getDate())}`;

  // Obtener todos los turnos de todos los guardias para este día
  const allShiftsForDay: ShiftApi[] = [];
  shiftsByGuardAndDate.forEach((shiftsByDate) => {
    const shifts = shiftsByDate[key] || [];
    allShiftsForDay.push(...shifts);
  });

  // Obtener los serviceIds únicos que tienen turnos en este día
  const activeServiceIds = new Set<number>();
  allShiftsForDay.forEach(shift => {
    if (shift.service) {
      activeServiceIds.add(shift.service);
    }
  });

  // Si hay un servicio seleccionado, mostrar brechas solo de ese servicio
  if (selectedService && selectedService.startTime && selectedService.endTime) {
    // Verificar si el día hovered está en el schedule del servicio seleccionado
    const hoveredDayStr = hoveredDay.toISOString().split('T')[0]; // YYYY-MM-DD
    const isHoveredDayInSchedule = selectedService.schedule && selectedService.schedule.includes(hoveredDayStr);
    
    if (!isHoveredDayInSchedule) {
      // Si el día no está en el schedule del servicio, no mostrar gaps
      return [];
    }

    const gaps = getServiceCoverageGaps(allShiftsForDay, selectedService.startTime!, selectedService.endTime!, selectedService.name);
    gaps.forEach(gap => allGaps.push(gap.description));
  } else {
    // Si no hay servicio seleccionado, mostrar brechas solo de servicios que tienen turnos en este día
    const activeServices = services.filter(s => s.startTime && s.endTime && activeServiceIds.has(s.id));
    activeServices.forEach(service => {
      const gaps = getServiceCoverageGaps(allShiftsForDay, service.startTime!, service.endTime!, service.name);
      gaps.forEach(gap => allGaps.push(gap.description));
    });
  }

  // Agrupar brechas por servicio y combinar las descripciones
  const gapsByService: Map<string, string[]> = new Map();
  allGaps.forEach(gap => {
    const colonIndex = gap.indexOf(':');
    if (colonIndex !== -1) {
      const serviceName = gap.substring(0, colonIndex).trim();
      const description = gap.substring(colonIndex + 1).trim();
      if (!gapsByService.has(serviceName)) {
        gapsByService.set(serviceName, []);
      }
      gapsByService.get(serviceName)!.push(description);
    } else {
      // Si no hay servicio, agrupar bajo una clave genérica
      if (!gapsByService.has('')) {
        gapsByService.set('', []);
      }
      gapsByService.get('')!.push(gap);
    }
  });

  // Combinar las brechas por servicio
  const combinedGaps: string[] = [];
  gapsByService.forEach((descriptions, serviceName) => {
    const combinedDescription = descriptions.join(' y ');
    const fullMessage = serviceName ? `${serviceName}: ${combinedDescription}` : combinedDescription;
    combinedGaps.push(fullMessage);
  });

  return combinedGaps;
}

// Importar COVERAGE_TEXTS aquí para usar en getServiceCoverageGaps
import { COVERAGE_TEXTS } from "./coverage-texts";

/**
 * Verifica si los turnos cubren completamente el horario del servicio
 */
export function isServiceFullyCovered(
  shifts: ShiftApi[],
  serviceStartTime: string,
  serviceEndTime: string
): boolean {
  const gaps = getServiceCoverageGaps(shifts, serviceStartTime, serviceEndTime, "");
  return gaps.length === 0;
}

/**
 * Información sobre la cobertura de un día
 */
export type DayCoverageInfo = {
  shouldHighlight: boolean;
  gaps: CoverageGap[];
  serviceName: string | null;
};

/**
 * Función para determinar si un día debe estar marcado en amarillo y obtener las brechas
 */
export function getDayCoverageInfo(
  day: Date,
  selectedService: { id: number; name: string; startTime: string | null; endTime: string | null; schedule: string[] | null } | null,
  services: Array<{ id: number; name: string; startTime: string | null; endTime: string | null; schedule: string[] | null }>,
  shiftsByGuardAndDate: Map<number, Record<string, ShiftApi[]>>
): DayCoverageInfo {
  // Si hay un servicio seleccionado, verificar solo ese
  if (selectedService && selectedService.startTime && selectedService.endTime) {
    // Verificar si el día está en el schedule del servicio seleccionado
    const dayStr = day.toISOString().split('T')[0]; // YYYY-MM-DD
    const isDayInSchedule = selectedService.schedule && selectedService.schedule.includes(dayStr);
    
    if (!isDayInSchedule) {
      // Si el día no está en el schedule del servicio, no marcar como gap
      return {
        shouldHighlight: false,
        gaps: [],
        serviceName: selectedService.name
      };
    }

    const key = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

    // Obtener todos los turnos de todos los guardias para este día
    const allShiftsForDay: ShiftApi[] = [];
    shiftsByGuardAndDate.forEach((shiftsByDate) => {
      const shifts = shiftsByDate[key] || [];
      allShiftsForDay.push(...shifts);
    });

    // Filtrar turnos solo del servicio seleccionado
    const shiftsForService = allShiftsForDay.filter(shift => shift.service === selectedService.id);
    
    // Siempre calcular gaps para el servicio seleccionado, incluso si no tiene turnos
    // Si no tiene turnos, mostrará el gap completo del horario del servicio
    const gaps = getServiceCoverageGaps(
      shiftsForService,
      selectedService.startTime,
      selectedService.endTime,
      selectedService.name
    );

    return {
      shouldHighlight: gaps.length > 0,
      gaps: gaps.slice(0, 3), // Mostrar máximo 3 brechas
      serviceName: selectedService.name
    };
  }

  // Si no hay servicio seleccionado (vista "todos"), verificar si hay algún servicio con brecha
  const key = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;

  // Obtener todos los turnos de todos los guardias para este día
  const allShiftsForDay: ShiftApi[] = [];
  shiftsByGuardAndDate.forEach((shiftsByDate) => {
    const shifts = shiftsByDate[key] || [];
    allShiftsForDay.push(...shifts);
  });

  // Obtener serviceIds únicos que tienen turnos en este día
  const activeServiceIds = new Set<number>();
  allShiftsForDay.forEach(shift => {
    if (shift.service) {
      activeServiceIds.add(shift.service);
    }
  });

  // Solo evaluar servicios que tienen turnos en este día
  const servicesWithTimes = services.filter(s => 
    s.startTime && s.endTime && activeServiceIds.has(s.id)
  );
  if (servicesWithTimes.length === 0) {
    return { shouldHighlight: false, gaps: [], serviceName: null };
  }

  // Verificar brechas para servicios que tienen turnos en este día
  const allGaps: Array<{ serviceName: string; gaps: CoverageGap[] }> = [];
  servicesWithTimes.forEach(service => {
    const serviceGaps = getServiceCoverageGaps(
      allShiftsForDay,
      service.startTime!,
      service.endTime!,
      service.name
    );
    if (serviceGaps.length > 0) {
      allGaps.push({ serviceName: service.name, gaps: serviceGaps });
    }
  });

  // Tomar las primeras brechas de los primeros servicios con brechas
  const topGaps: CoverageGap[] = [];
  allGaps.slice(0, 2).forEach(serviceGaps => {
    serviceGaps.gaps.slice(0, 2).forEach(gap => {
      topGaps.push({
        ...gap,
        description: `${serviceGaps.serviceName}: ${gap.description}`
      });
    });
  });

  return {
    shouldHighlight: allGaps.length > 0,
    gaps: topGaps.slice(0, 3), // Máximo 3 brechas
    serviceName: null
  };
}
