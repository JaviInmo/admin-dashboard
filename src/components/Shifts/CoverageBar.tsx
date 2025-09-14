"use client";
import type { Shift } from "@/components/Shifts/types";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";

// Paleta de colores - primarios primero, luego secundarios
const COLORS = [
  // Colores primarios (más distintivos y vibrantes)
  "#3B82F6", // azul principal
  "#EF4444", // rojo principal
  "#10B981", // verde principal
  "#F59E0B", // ámbar principal
  "#8B5CF6", // violeta principal
  "#EC4899", // rosa principal
  "#14B8A6", // teal principal
  "#F97316", // naranja principal
  
  // Colores secundarios (variaciones más suaves)
  "#6366F1", // índigo
  "#84CC16", // lima
  "#DC2626", // rojo oscuro
  "#059669", // esmeralda oscuro
  "#D97706", // ámbar oscuro
  "#7C3AED", // violeta oscuro
  "#BE185D", // rosa oscuro
  "#0891B2", // cian
  "#EA580C", // naranja oscuro
  "#4F46E5", // índigo oscuro
  "#65A30D", // lima oscuro
  "#B91C1C", // rojo muy oscuro
  "#047857", // esmeralda muy oscuro
  "#92400E", // ámbar muy oscuro
  "#5B21B6", // violeta muy oscuro
  "#A21CAF", // rosa muy oscuro
  "#0E7490", // cian oscuro
];

function clampToDay(start: Date, end: Date, day: Date): [number, number] | null {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const s = Math.max(start.getTime(), dayStart);
  const e = Math.min(end.getTime(), dayEnd);
  if (e <= s) return null;
  return [s, e];
}

function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) return [];
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  let [cs, ce] = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    if (s <= ce) {
      ce = Math.max(ce, e);
    } else {
      merged.push([cs, ce]);
      [cs, ce] = [s, e];
    }
  }
  merged.push([cs, ce]);
  return merged;
}

type ColorBy = "guard" | "property";

export function CoverageBar({ 
  day, 
  shifts, 
  colorBy = "property", 
  guards = [], 
  properties = [],
  showTooltip = true,
  hasGap = false,
  showStats = false
}: { 
  day: Date; 
  shifts: Shift[];
  colorBy?: ColorBy;
  guards?: Guard[];
  properties?: AppProperty[];
  showTooltip?: boolean;
  hasGap?: boolean;
  showStats?: boolean;
}) {
  // Función para obtener color basado en ID
  const getColor = (id: number): string => {
    return COLORS[id % COLORS.length];
  };

  // Función para obtener información del tooltip
  const getTooltipContent = (shift: Shift): string => {
    if (colorBy === "guard") {
      const guard = guards.find(g => g.id === shift.guard);
      if (guard) {
        return `${guard.firstName} ${guard.lastName}`;
      }
      return `Guardia ID: ${shift.guard}`;
    } else {
      const property = properties.find(p => p.id === shift.property);
      if (property) {
        const alias = property.alias ? `${property.alias}` : "";
        const name = property.name || `Propiedad ${property.id}`;
        return alias ? `${alias}\n${name}` : name;
      }
      return `Propiedad ID: ${shift.property}`;
    }
  };

  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const totalMs = 24 * 60 * 60 * 1000;
  const dayEnd = dayStart + totalMs;

  // Calcular estadísticas para mostrar debajo de la barra
  // Incluir TODOS los turnos que tengan tiempo dentro de este día (empiecen antes, durante o crucen)
  const dayShifts = shifts.filter(shift => {
    if (!shift.startTime || !shift.endTime) return false;
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = new Date(shift.endTime).getTime();
    
    // El turno debe tener al menos algo de tiempo dentro del día
    return shiftEnd > dayStart && shiftStart < dayEnd;
  });
  
  const totalTurnos = dayShifts.length;
  
  // Calcular horas solo de los turnos que tocan este día, considerando solo las horas dentro del día
  const totalHoras = dayShifts.reduce((sum, shift) => {
    if (!shift.startTime || !shift.endTime) return sum;
    
    const shiftStart = new Date(shift.startTime).getTime();
    const shiftEnd = new Date(shift.endTime).getTime();
    
    // Limitar el turno a las fronteras del día
    const effectiveStart = Math.max(shiftStart, dayStart);
    const effectiveEnd = Math.min(shiftEnd, dayEnd);
    
    // Si el turno efectivo es válido, calcular las horas
    if (effectiveEnd > effectiveStart) {
      const hoursInDay = (effectiveEnd - effectiveStart) / (1000 * 60 * 60);
      return sum + hoursInDay;
    }
    
    return sum;
  }, 0);

  // Agrupar turnos por el criterio de color (guardia o propiedad)
  const shiftsByColor: Record<number, Shift[]> = {};
  for (const shift of shifts) {
    if (!shift.startTime || !shift.endTime) continue;
    const colorKey = colorBy === "guard" ? shift.guard : shift.property;
    if (!shiftsByColor[colorKey]) {
      shiftsByColor[colorKey] = [];
    }
    shiftsByColor[colorKey].push(shift);
  }

  // Procesar intervalos por cada grupo de color
  const colorSegments: Array<{
    intervals: Array<[number, number]>;
    color: string;
    shift: Shift; // Para tooltip
  }> = [];

  Object.entries(shiftsByColor).forEach(([colorKey, groupShifts]) => {
    const intervals: Array<[number, number]> = [];
    for (const s of groupShifts) {
      if (!s.startTime || !s.endTime) continue;
      const st = new Date(s.startTime);
      const et = new Date(s.endTime);
      const clamped = clampToDay(st, et, day);
      if (clamped) intervals.push(clamped);
    }
    const merged = mergeIntervals(intervals);
    
    if (merged.length > 0) {
      colorSegments.push({
        intervals: merged,
        color: getColor(Number(colorKey)),
        shift: groupShifts[0] // Usar el primer turno para tooltip
      });
    }
  });

  return (
    <div className="w-full">
      {/* Contenedor de la barra */}
      <div className="w-full h-6 relative">
        {/* Fondo rojo para gaps que cubre toda la celda */}
        {hasGap && (
          <div className="absolute inset-0 bg-red-200 bg-opacity-60 rounded"></div>
        )}
        
        {/* Barra de cobertura */}
        <div className={`w-full h-full rounded bg-gray-200 relative overflow-hidden ${hasGap ? 'ring-4 ring-red-500 ring-opacity-80' : ''}`}>
          {/* Render coverage segments with different colors */}
          {colorSegments.map((segment, segmentIdx) => (
            segment.intervals.map(([s, e], intervalIdx) => {
              const left = ((s - dayStart) / totalMs) * 100;
              const width = ((e - s) / totalMs) * 100;
              return (
                <div
                  key={`${segmentIdx}-${intervalIdx}`}
                  className="absolute top-0 bottom-0 transition-opacity duration-200 hover:opacity-80"
                  style={{ 
                    left: `${left}%`, 
                    width: `${width}%`,
                    backgroundColor: segment.color
                  }}
                  title={showTooltip ? getTooltipContent(segment.shift) : undefined}
                />
              );
            })
          ))}
        </div>
      </div>
      
      {/* Estadísticas debajo de la barra */}
      {showStats && (
        <div className="text-center text-[10px] text-muted-foreground mt-0.5 leading-none">
          {totalTurnos > 0 ? `${totalTurnos}t/${totalHoras.toFixed(0)}h` : '0t/0h'}
        </div>
      )}
    </div>
  );
}
