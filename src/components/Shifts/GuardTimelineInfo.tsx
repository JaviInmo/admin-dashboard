"use client";
import type { Shift } from "@/components/Shifts/types";
import type { Guard } from "@/components/Guards/types";

export function GuardTimelineInfo({ 
  day, 
  shifts, 
  guards = [],
  compact = false
}: { 
  day: Date; 
  shifts: Shift[];
  guards?: Guard[];
  compact?: boolean;
}) {
  console.log('📊 GuardTimelineInfo - day:', day.toISOString().split('T')[0]);
  console.log('📊 GuardTimelineInfo - shifts recibidos:', shifts.length);
  console.log('📊 GuardTimelineInfo - guards disponibles:', guards.length);
  
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  // Filtrar turnos que tocan este día
  const dayShifts = shifts.filter(shift => {
    // Usar plannedStartTime/plannedEndTime si startTime/endTime son null
    const effectiveStartTime = shift.startTime || shift.plannedStartTime;
    const effectiveEndTime = shift.endTime || shift.plannedEndTime;
    
    if (!effectiveStartTime || !effectiveEndTime) return false;
    
    const shiftStart = new Date(effectiveStartTime).getTime();
    const shiftEnd = new Date(effectiveEndTime).getTime();
    return shiftEnd > dayStart && shiftStart < dayEnd;
  });

  console.log('📊 GuardTimelineInfo - dayShifts filtrados:', dayShifts.length);
  console.log('📊 GuardTimelineInfo - dayShifts data:', dayShifts);

  if (dayShifts.length === 0) {
    console.log('❌ GuardTimelineInfo - NO hay turnos para este día, no se renderiza');
    return null;
  }

  console.log('✅ GuardTimelineInfo - HAY turnos, renderizando...');

  // Agrupar turnos por guardia
  const shiftsByGuard = new Map<number, Shift[]>();
  dayShifts.forEach(shift => {
    if (!shiftsByGuard.has(shift.guard)) {
      shiftsByGuard.set(shift.guard, []);
    }
    shiftsByGuard.get(shift.guard)!.push(shift);
  });

  return (
    <div className="mt-1 space-y-1">
      {Array.from(shiftsByGuard.entries()).map(([guardId, guardShifts]) => {
        const guard = guards.find(g => g.id === guardId);
        const guardName = guard ? `${guard.firstName} ${guard.lastName}` : `Guardia ${guardId}`;
        
        // Ordenar turnos por hora de inicio
        const sortedShifts = guardShifts.sort((a, b) => {
          const aStart = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bStart = b.startTime ? new Date(b.startTime).getTime() : 0;
          return aStart - bStart;
        });

        return (
          <div key={guardId} className={`text-[10px] ${compact ? 'leading-tight' : ''}`}>
            <div className="font-medium truncate text-foreground">
              {guardName}
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
