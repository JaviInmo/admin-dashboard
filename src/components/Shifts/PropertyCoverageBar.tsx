import { usePropertyServices } from "./PropertyServiceSelector";
import { CoverageBar } from "./CoverageBar";
import type { Shift } from "@/components/Shifts/types";
import type { Service } from "@/components/Services/types";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { getServiceCoverageGaps } from "@/components/Properties/properties shifts content/coverageGaps";

interface PropertyCoverageBarProps {
  day: Date;
  shifts: Shift[];
  propertyId: number;
  selectedServiceId: number | "all" | undefined;
  showStats: boolean;
}

// Función helper para calcular flag de un servicio específico
function calculateServiceFlag(
  service: Service,
  day: Date,
  shifts: Shift[]
): { flag: "gap" | "overtime" | "complete" | null; gapInfo: string | null } {
  if (!service.startTime || !service.endTime) return { flag: null, gapInfo: null };

  // Verificar si el día está en el schedule del servicio
  const dayStr = day.toISOString().split('T')[0]; // YYYY-MM-DD
  const isDayInSchedule = service.schedule && service.schedule.includes(dayStr);
  
  if (!isDayInSchedule) {
    // Si el día no está programado en el schedule del servicio, no mostrar flag
    return { flag: null, gapInfo: null };
  }

  // Parsear horario del servicio
  const [serviceStartHour, serviceStartMin] = service.startTime.split(':').map(Number);
  const [serviceEndHour, serviceEndMin] = service.endTime.split(':').map(Number);
  
  // Crear timestamps del servicio para este día
  const serviceStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), serviceStartHour, serviceStartMin).getTime();
  const serviceEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), serviceEndHour, serviceEndMin).getTime();
  
  const serviceEndAdjusted = serviceEnd <= serviceStart 
    ? serviceEnd + (24 * 60 * 60 * 1000)
    : serviceEnd;
  
  const serviceDurationHours = (serviceEndAdjusted - serviceStart) / (1000 * 60 * 60);
  
  // Calcular horas de turnos para este servicio en este día
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const dayEnd = dayStart + (24 * 60 * 60 * 1000);
  
  const serviceShifts = shifts.filter(s => s.service === service.id);
  
  const totalHoras = serviceShifts.reduce((sum, shift) => {
    const effectiveStartTime = shift.startTime || shift.plannedStartTime;
    const effectiveEndTime = shift.endTime || shift.plannedEndTime;
    
    if (!effectiveStartTime || !effectiveEndTime) return sum;
    
    const shiftStart = new Date(effectiveStartTime).getTime();
    const shiftEnd = new Date(effectiveEndTime).getTime();
    
    // Verificar que el turno está en este día
    if (shiftEnd <= dayStart || shiftStart >= dayEnd) return sum;
    
    const effectiveStart = Math.max(shiftStart, dayStart);
    const effectiveEnd = Math.min(shiftEnd, dayEnd);
    
    if (effectiveEnd > effectiveStart) {
      const hoursInDay = (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
      return sum + hoursInDay;
    }
    
    return sum;
  }, 0);
  
  const difference = Math.abs(totalHoras - serviceDurationHours);
  const tolerance = 0.1;
  
  let flag: "gap" | "overtime" | "complete" | null = null;
  let gapInfo: string | null = null;
  
  if (difference <= tolerance) {
    flag = "complete";
  } else if (totalHoras > serviceDurationHours) {
    flag = "overtime";
    gapInfo = `${(totalHoras - serviceDurationHours).toFixed(1)}h extras`;
  } else {
    flag = "gap";
    // Usar getServiceCoverageGaps para obtener información detallada del gap
    const gaps = getServiceCoverageGaps(serviceShifts, service.startTime, service.endTime, service.name || '');
    if (gaps.length > 0) {
      gapInfo = gaps.map(g => g.description).join('\n');
    } else {
      gapInfo = `Faltan ${(serviceDurationHours - totalHoras).toFixed(1)}h`;
    }
  }
  
  return { flag, gapInfo };
}

export function PropertyCoverageBar({
  day,
  shifts,
  propertyId,
  selectedServiceId,
  showStats
}: PropertyCoverageBarProps) {
  const services = usePropertyServices(propertyId);
  
  // Calcular horas totales y turnos para estadísticas
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const dayEnd = dayStart + (24 * 60 * 60 * 1000);
  
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
  
  // Si hay un servicio específico seleccionado, usar CoverageBar original
  if (selectedServiceId && selectedServiceId !== "all") {
    const selectedService = services.find(s => s.id === selectedServiceId);
    return (
      <CoverageBar
        day={day}
        shifts={shifts}
        showStats={showStats}
        service={selectedService || null}
      />
    );
  }
  
  // Si "todos" está seleccionado, mostrar flags de todos los servicios
  const serviceFlags: Array<{ service: Service; flag: "gap" | "overtime" | "complete"; gapInfo: string | null }> = [];
  
  for (const service of services) {
    const result = calculateServiceFlag(service, day, shifts);
    
    // Debug: log para entender qué está pasando
    if (result.flag) {
      console.log(`🔍 Service "${service.name}" on ${day.toISOString().split('T')[0]}:`, {
        flag: result.flag,
        gapInfo: result.gapInfo,
        schedule: service.schedule,
        startTime: service.startTime,
        endTime: service.endTime
      });
    }
    
    if (result.flag) {
      serviceFlags.push({ service, flag: result.flag, gapInfo: result.gapInfo });
    }
  }
  
  return (
    <div className="w-full">
      {/* Contenedor para múltiples flags */}
      <div className="w-full min-h-6 flex flex-wrap items-center justify-center gap-1 bg-gray-50 rounded border border-gray-200 p-1">
        {serviceFlags.length > 0 ? (
          serviceFlags.map(({ service, flag, gapInfo }) => {
            const tooltipText = gapInfo 
              ? `${service.name}: ${flag === "complete" ? "Completo" : flag === "overtime" ? "Overtime" : "Gap"}\n${gapInfo}`
              : `${service.name}: ${flag === "complete" ? "Completo" : flag === "overtime" ? "Overtime" : "Gap"}`;
            
            // Extraer las horas del gapInfo si existe (ej: "Faltan 11.0h" -> "11h")
            let shortGapText = "";
            if (gapInfo && flag === "gap") {
              const match = gapInfo.match(/Faltan (\d+\.?\d*)h/);
              if (match) {
                shortGapText = ` -${Math.round(Number(match[1]))}h`;
              }
            } else if (gapInfo && flag === "overtime") {
              const match = gapInfo.match(/(\d+\.?\d*)h extras/);
              if (match) {
                shortGapText = ` +${Math.round(Number(match[1]))}h`;
              }
            }
            
            return (
              <div 
                key={service.id} 
                className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-white border"
                title={tooltipText}
              >
                {flag === "complete" && <CheckCircle className="w-3 h-3 text-green-600" />}
                {flag === "overtime" && <Clock className="w-3 h-3 text-orange-600" />}
                {flag === "gap" && <AlertTriangle className="w-3 h-3 text-red-600" />}
                <span className="text-[9px] font-medium truncate max-w-[60px]">
                  {service.name || `S${service.id}`}{shortGapText}
                </span>
              </div>
            );
          })
        ) : totalTurnos > 0 ? (
          <span className="text-xs text-muted-foreground">
            {totalTurnos}t / {totalHoras.toFixed(0)}h
          </span>
        ) : (
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
