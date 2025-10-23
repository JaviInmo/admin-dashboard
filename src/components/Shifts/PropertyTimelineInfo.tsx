"use client";
import type { Shift } from "@/components/Shifts/types";
import type { AppProperty } from "@/lib/services/properties";

export function PropertyTimelineInfo({ 
  day, 
  shifts, 
  properties = [],
  compact = false
}: { 
  day: Date; 
  shifts: Shift[];
  properties?: AppProperty[];
  compact?: boolean;
}) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  // Filtrar turnos que tocan este día
  const dayShifts = shifts.filter(shift => {
    const effectiveStartTime = shift.startTime || shift.plannedStartTime;
    const effectiveEndTime = shift.endTime || shift.plannedEndTime;
    
    if (!effectiveStartTime || !effectiveEndTime) return false;
    
    const shiftStart = new Date(effectiveStartTime).getTime();
    const shiftEnd = new Date(effectiveEndTime).getTime();
    return shiftEnd > dayStart && shiftStart < dayEnd;
  });

  if (dayShifts.length === 0) {
    return null;
  }

  // Agrupar turnos por propiedad
  const shiftsByProperty = new Map<number, Shift[]>();
  dayShifts.forEach(shift => {
    const propertyId = shift.property;
    if (propertyId) {
      if (!shiftsByProperty.has(propertyId)) {
        shiftsByProperty.set(propertyId, []);
      }
      shiftsByProperty.get(propertyId)!.push(shift);
    }
  });

  return (
    <div className="mt-1 space-y-1">
      {Array.from(shiftsByProperty.entries()).map(([propertyId, propertyShifts]) => {
        const property = properties.find(p => p.id === propertyId);
        const propertyName = property?.alias || property?.name || `Propiedad ${propertyId}`;
        
        // Ordenar turnos por hora de inicio
        const sortedShifts = propertyShifts.sort((a, b) => {
          const effectiveStartA = a.startTime || a.plannedStartTime;
          const effectiveStartB = b.startTime || b.plannedStartTime;
          const aStart = effectiveStartA ? new Date(effectiveStartA).getTime() : 0;
          const bStart = effectiveStartB ? new Date(effectiveStartB).getTime() : 0;
          return aStart - bStart;
        });

        return (
          <div key={propertyId} className={`text-[10px] ${compact ? 'leading-tight' : ''}`}>
            <div className="font-medium truncate text-foreground">
              {propertyName}
            </div>
            <div className="space-y-0.5">
              {sortedShifts.map((shift, idx) => {
                const effectiveStartTime = shift.startTime || shift.plannedStartTime;
                const effectiveEndTime = shift.endTime || shift.plannedEndTime;
                
                const startTime = effectiveStartTime ? new Date(effectiveStartTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) : '--:--';
                const endTime = effectiveEndTime ? new Date(effectiveEndTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) : '--:--';
                
                return (
                  <div key={shift.id || idx} className="text-muted-foreground flex items-center gap-1">
                    <span>{startTime} - {endTime}</span>
                    {shift.hoursWorked && (
                      <span className="text-[9px]">({shift.hoursWorked.toFixed(1)}h)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
