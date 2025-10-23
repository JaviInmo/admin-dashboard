import type { Shift } from "@/components/Shifts/types";
import type { Service } from "@/components/Services/types";

export type GapInfo = {
  type: "start" | "end" | "middle";
  time: string; // Hora en formato HH:mm
  duration: number; // Duración del gap en horas
};

/**
 * Detecta gaps en la cobertura de un servicio para un día específico
 * y retorna información detallada sobre dónde están los gaps
 */
export function detectServiceGaps(
  service: Service,
  day: Date,
  shifts: Shift[]
): GapInfo[] {
  if (!service.startTime || !service.endTime) return [];

  // Parsear horario del servicio
  const [serviceStartHour, serviceStartMin] = service.startTime.split(':').map(Number);
  const [serviceEndHour, serviceEndMin] = service.endTime.split(':').map(Number);
  
  // Crear timestamps del servicio para este día
  const serviceStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), serviceStartHour, serviceStartMin).getTime();
  let serviceEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), serviceEndHour, serviceEndMin).getTime();
  
  // Si el servicio cruza medianoche (ej: 22:00-06:00)
  if (serviceEnd <= serviceStart) {
    serviceEnd += 24 * 60 * 60 * 1000;
  }

  // Obtener intervalos de turnos que cubren este servicio
  const serviceShifts = shifts.filter(s => s.service === service.id);
  
  const intervals: Array<[number, number]> = [];
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const dayEnd = dayStart + (24 * 60 * 60 * 1000);
  
  for (const shift of serviceShifts) {
    const effectiveStartTime = shift.startTime || shift.plannedStartTime;
    const effectiveEndTime = shift.endTime || shift.plannedEndTime;
    
    if (!effectiveStartTime || !effectiveEndTime) continue;
    
    const shiftStart = new Date(effectiveStartTime).getTime();
    const shiftEnd = new Date(effectiveEndTime).getTime();
    
    // Verificar que el turno está en este día
    if (shiftEnd <= dayStart || shiftStart >= dayEnd) continue;
    
    // Limitar el turno al rango del servicio
    const effectiveStart = Math.max(shiftStart, serviceStart);
    const effectiveEnd = Math.min(shiftEnd, serviceEnd);
    
    if (effectiveStart < effectiveEnd) {
      intervals.push([effectiveStart, effectiveEnd]);
    }
  }
  
  if (intervals.length === 0) {
    // Sin turnos = gap total
    const duration = (serviceEnd - serviceStart) / (1000 * 60 * 60);
    return [{
      type: "start",
      time: service.startTime.substring(0, 5), // HH:mm
      duration
    }];
  }
  
  // Ordenar y fusionar intervalos
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  let [currentStart, currentEnd] = intervals[0];
  
  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    if (start <= currentEnd) {
      currentEnd = Math.max(currentEnd, end);
    } else {
      merged.push([currentStart, currentEnd]);
      [currentStart, currentEnd] = [start, end];
    }
  }
  merged.push([currentStart, currentEnd]);
  
  // Detectar gaps
  const gaps: GapInfo[] = [];
  
  // Gap al inicio
  if (merged[0][0] > serviceStart) {
    const gapDuration = (merged[0][0] - serviceStart) / (1000 * 60 * 60);
    gaps.push({
      type: "start",
      time: service.startTime.substring(0, 5),
      duration: gapDuration
    });
  }
  
  // Gaps en el medio
  for (let i = 0; i < merged.length - 1; i++) {
    const gapStart = merged[i][1];
    const gapEnd = merged[i + 1][0];
    const gapDuration = (gapEnd - gapStart) / (1000 * 60 * 60);
    
    const gapStartDate = new Date(gapStart);
    const gapTime = `${gapStartDate.getHours().toString().padStart(2, '0')}:${gapStartDate.getMinutes().toString().padStart(2, '0')}`;
    
    gaps.push({
      type: "middle",
      time: gapTime,
      duration: gapDuration
    });
  }
  
  // Gap al final
  if (merged[merged.length - 1][1] < serviceEnd) {
    const gapStart = merged[merged.length - 1][1];
    const gapDuration = (serviceEnd - gapStart) / (1000 * 60 * 60);
    
    const gapStartDate = new Date(gapStart);
    const gapTime = `${gapStartDate.getHours().toString().padStart(2, '0')}:${gapStartDate.getMinutes().toString().padStart(2, '0')}`;
    
    gaps.push({
      type: "end",
      time: gapTime,
      duration: gapDuration
    });
  }
  
  return gaps;
}

/**
 * Formatea la información de gaps para mostrar en tooltip
 */
export function formatGapInfo(gaps: GapInfo[]): string {
  if (gaps.length === 0) return "";
  
  return gaps.map(gap => {
    const durationText = gap.duration.toFixed(1) + "h";
    
    if (gap.type === "start") {
      return `Gap desde el inicio (${gap.time}): ${durationText}`;
    } else if (gap.type === "end") {
      return `Gap después de ${gap.time}: ${durationText}`;
    } else {
      return `Gap desde ${gap.time}: ${durationText}`;
    }
  }).join("\n");
}
