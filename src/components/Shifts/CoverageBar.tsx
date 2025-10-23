"use client";
import type { Shift } from "@/components/Shifts/types";
import type { Service } from "@/components/Services/types";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { getServiceCoverageGaps } from "@/components/Properties/properties shifts content/coverageGaps";

export function CoverageBar({ 
  day, 
  shifts,
  showStats = false,
  service = null
}: { 
  day: Date; 
  shifts: Shift[];
  showStats?: boolean;
  service?: Service | null;
}) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const dayEnd = dayStart + (24 * 60 * 60 * 1000);

  // Calcular estadísticas para mostrar
  const dayShifts = shifts.filter(shift => {
    const effectiveStartTime = shift.startTime || shift.plannedStartTime;
    const effectiveEndTime = shift.endTime || shift.plannedEndTime;
    
    if (!effectiveStartTime || !effectiveEndTime) return false;
    
    const shiftStart = new Date(effectiveStartTime).getTime();
    const shiftEnd = new Date(effectiveEndTime).getTime();
    
    return shiftEnd > dayStart && shiftStart < dayEnd;
  });
  
  const totalTurnos = dayShifts.length;
  
  const totalHoras = dayShifts.reduce((sum, shift) => {
    const effectiveStartTime = shift.startTime || shift.plannedStartTime;
    const effectiveEndTime = shift.endTime || shift.plannedEndTime;
    
    if (!effectiveStartTime || !effectiveEndTime) return sum;
    
    const shiftStart = new Date(effectiveStartTime).getTime();
    const shiftEnd = new Date(effectiveEndTime).getTime();
    
    const effectiveStart = Math.max(shiftStart, dayStart);
    const effectiveEnd = Math.min(shiftEnd, dayEnd);
    
    if (effectiveEnd > effectiveStart) {
      const hoursInDay = (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
      return sum + hoursInDay;
    }
    
    return sum;
  }, 0);

  // Calcular flags basados en el servicio (si existe)
  let coverageFlag: "gap" | "overtime" | "complete" | null = null;
  let gapInfo: string | null = null;
  
  if (service && service.startTime && service.endTime) {
    // Verificar si el día está en el schedule del servicio
    const dayStr = day.toISOString().split('T')[0]; // YYYY-MM-DD
    const isDayInSchedule = service.schedule && service.schedule.includes(dayStr);
    
    if (!isDayInSchedule) {
      // Si el día no está programado en el schedule del servicio, no mostrar flag
      // Solo mostrar estadísticas si hay turnos
      if (totalTurnos === 0) {
        return (
          <div className="w-full">
            <div className="w-full min-h-6 flex items-center justify-center bg-gray-50 rounded border border-gray-200 p-1">
              <span className="text-xs text-muted-foreground">Sin turnos</span>
            </div>
            {showStats && (
              <div className="text-center text-[10px] text-muted-foreground mt-0.5 leading-none">
                0t / 0h
              </div>
            )}
          </div>
        );
      }
      // Si hay turnos pero no está en schedule, mostrar solo estadísticas sin flag
      return (
        <div className="w-full">
          <div className="w-full min-h-6 flex items-center justify-center bg-gray-50 rounded border border-gray-200 p-1">
            <span className="text-xs text-muted-foreground">
              {totalTurnos}t / {totalHoras.toFixed(0)}h
            </span>
          </div>
          {showStats && (
            <div className="text-center text-[10px] text-muted-foreground mt-0.5 leading-none">
              {totalTurnos}t / {totalHoras.toFixed(0)}h
            </div>
          )}
        </div>
      );
    }

    // Parsear horario del servicio
    const [serviceStartHour, serviceStartMin] = service.startTime.split(':').map(Number);
    const [serviceEndHour, serviceEndMin] = service.endTime.split(':').map(Number);
    
    // Crear timestamps del servicio para este día
    const serviceStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), serviceStartHour, serviceStartMin).getTime();
    const serviceEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), serviceEndHour, serviceEndMin).getTime();
    
    // Si el servicio termina antes de medianoche del mismo día (ej: 08:00-17:00)
    // o si cruza medianoche (ej: 22:00-06:00), ajustar
    const serviceEndAdjusted = serviceEnd <= serviceStart 
      ? serviceEnd + (24 * 60 * 60 * 1000) // Añadir 24h si cruza medianoche
      : serviceEnd;
    
    const serviceDurationHours = (serviceEndAdjusted - serviceStart) / (1000 * 60 * 60);
    
    // Comparar con horas totales de turnos en este día
    const difference = Math.abs(totalHoras - serviceDurationHours);
    const tolerance = 0.1; // Tolerancia de 6 minutos (0.1 horas)
    
    if (difference <= tolerance) {
      coverageFlag = "complete"; // Exacto
    } else if (totalHoras > serviceDurationHours) {
      coverageFlag = "overtime"; // Más horas que el servicio
      gapInfo = `${(totalHoras - serviceDurationHours).toFixed(1)}h extras`;
    } else {
      coverageFlag = "gap"; // Menos horas que el servicio
      
      // Obtener detalles del gap usando getServiceCoverageGaps
      const gaps = getServiceCoverageGaps(shifts, service.startTime, service.endTime, service.name || '');
      if (gaps.length > 0) {
        gapInfo = gaps.map(g => g.description).join('\n');
      } else {
        gapInfo = `Faltan ${(serviceDurationHours - totalHoras).toFixed(1)}h`;
      }
    }
  }

  return (
    <div className="w-full">
      {/* Contenedor para flags en lugar de barras */}
      <div className="w-full h-6 relative flex items-center justify-center gap-2 bg-gray-50 rounded border border-gray-200">
        {/* Flags de cobertura */}
        {coverageFlag === "complete" && (
          <div className="flex items-center gap-1" title="Cobertura completa">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Completo</span>
          </div>
        )}
        {coverageFlag === "overtime" && (
          <div className="flex items-center gap-1" title={gapInfo || "Overtime - más horas que el servicio"}>
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-700">Overtime</span>
          </div>
        )}
        {coverageFlag === "gap" && (
          <div 
            className="flex items-center gap-1" 
            title={gapInfo || "Gap - menos horas que el servicio"}
          >
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-700">Gap</span>
          </div>
        )}
        
        {/* Si no hay servicio o no hay flag, mostrar estadísticas básicas */}
        {!coverageFlag && totalTurnos > 0 && (
          <span className="text-xs text-muted-foreground">
            {totalTurnos}t / {totalHoras.toFixed(0)}h
          </span>
        )}
        
        {!coverageFlag && totalTurnos === 0 && (
          <span className="text-xs text-muted-foreground">Sin turnos</span>
        )}
      </div>
      
      {/* Estadísticas debajo */}
      {showStats && (
        <div className="text-center text-[10px] text-muted-foreground mt-0.5 leading-none">
          {totalTurnos}t / {totalHoras.toFixed(0)}h
        </div>
      )}
    </div>
  );
}
