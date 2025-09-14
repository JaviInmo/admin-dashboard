"use client";

import { useMemo, useState } from "react";
import { useShiftsFilters } from "@/contexts/shifts-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listProperties, type AppProperty } from "@/lib/services/properties";
import { listShifts } from "@/lib/services/shifts";
import { listGuards } from "@/lib/services/guard";
import type { Guard } from "@/components/Guards/types";
import GuardsShiftsModal from "@/components/Guards/GuardsShiftsModalImproved";
import type { Shift } from "@/components/Shifts/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CoverageBar } from "./CoverageBar";
import PropertyShiftsModalImproved from "@/components/Properties/PropertyShiftsModalImproved";
import TimelineDetails from "@/components/Shifts/TimelineDetails";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function endOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = startOfDay(d); const day = r.getDay(); const diff = day; r.setDate(r.getDate() - diff); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 1); }

export default function TimelineCombined() {
  const { rangeType, anchorDate, status, view, setView, selectedPropertyIds, selectedGuardIds } = useShiftsFilters();
  const queryClient = useQueryClient();
  const [modalProperty, setModalProperty] = useState<{ id: number; name?: string; selectedDate?: Date } | null>(null);
  const [modalGuard, setModalGuard] = useState<{ id: number; name?: string; selectedDate?: Date } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [gapMode, setGapMode] = useState<"none" | "days" | "properties" | "all">("none");

  const { data: propsData } = useQuery({
    queryKey: ["properties", 1, 500],
    queryFn: async () => (await listProperties(1, undefined, 500)).items ?? [],
    staleTime: 60_000,
  });
  const properties: AppProperty[] = propsData ?? [];

  const { data: shiftsData } = useQuery({
    queryKey: ["shifts", "all", 1, 500],
    queryFn: async () => (await listShifts(1, undefined, 500)).items ?? [],
    staleTime: 15_000,
  });
  const allShifts: Shift[] = shiftsData ?? [];

  const { data: guardsData } = useQuery({
    queryKey: ["guards", 1, 500],
    queryFn: async () => (await listGuards(1, undefined, 500, "first_name")).items ?? [],
    staleTime: 60_000,
  });
  const guards: Guard[] = guardsData ?? [];

  const [displayDays, from, to] = useMemo(() => {
    if (rangeType === "day") {
      const s = startOfDay(anchorDate);
      return [[s], s, addDays(s, 1)];
    }
    if (rangeType === "week") {
      const s = startOfWeek(anchorDate);
      const days = Array.from({ length: 7 }, (_, i) => addDays(s, i));
      return [days, s, addDays(s, 7)];
    }
    if (rangeType === "custom") {
      const s = startOfDay(anchorDate);
      const customEndDateStr = localStorage.getItem("customEndDate");
      if (customEndDateStr) {
        const e = new Date(customEndDateStr);
        const count = Math.ceil((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        const days = Array.from({ length: count }, (_, i) => addDays(s, i));
        return [days, s, addDays(e, 1)];
      }
      // Fallback to single day if no custom end date
      return [[s], s, addDays(s, 1)];
    }
    // month
    const s = startOfMonth(anchorDate);
    const e = endOfMonth(anchorDate);
    const count = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
    const days = Array.from({ length: count }, (_, i) => addDays(s, i));
    return [days, s, e];
  }, [rangeType, anchorDate]);

  const filtered = useMemo(() => {
    const stSet = status; // Set
    return allShifts.filter((s) => {
      if (!s.startTime || !s.endTime) return false;
      if (stSet.size && s.status && !stSet.has(s.status as any)) return false;
      const st = new Date(s.startTime).getTime();
      const et = new Date(s.endTime).getTime();
      if (!(et > from.getTime() && st < to.getTime())) return false;
      if (selectedPropertyIds.length && (!s.property || !selectedPropertyIds.includes(Number(s.property)))) return false;
      if (selectedGuardIds.length && (!s.guard || !selectedGuardIds.includes(Number(s.guard)))) return false;
      return true;
    });
  }, [allShifts, status, from, to, selectedPropertyIds, selectedGuardIds]);

  const byProperty: Record<number, Shift[]> = useMemo(() => {
    const map: Record<number, Shift[]> = {};
    for (const s of filtered) {
      const pid = s.property ? Number(s.property) : -1;
      if (!map[pid]) map[pid] = [];
      map[pid].push(s);
    }
    return map;
  }, [filtered]);

  const byGuard: Record<number, Shift[]> = useMemo(() => {
    const map: Record<number, Shift[]> = {};
    for (const s of filtered) {
      const gid = s.guard ? Number(s.guard) : -1;
      if (!map[gid]) map[gid] = [];
      map[gid].push(s);
    }
    return map;
  }, [filtered]);

  // Función para detectar gaps (días sin cobertura completa)
  const detectGaps = (day: Date, shifts: Shift[]): boolean => {
    if (!shifts.length) return true; // Sin turnos = gap
    
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    
    // Convertir turnos a intervalos del día
    const intervals: Array<[number, number]> = [];
    for (const shift of shifts) {
      if (!shift.startTime || !shift.endTime) continue;
      const startTime = Math.max(new Date(shift.startTime).getTime(), dayStart);
      const endTime = Math.min(new Date(shift.endTime).getTime(), dayEnd);
      if (startTime < endTime) {
        intervals.push([startTime, endTime]);
      }
    }
    
    if (intervals.length === 0) return true;
    
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
    
    // Verificar si hay gaps
    if (merged[0][0] > dayStart) return true; // Gap al inicio
    if (merged[merged.length - 1][1] < dayEnd) return true; // Gap al final
    
    // Verificar gaps entre intervalos
    for (let i = 0; i < merged.length - 1; i++) {
      if (merged[i][1] < merged[i + 1][0]) return true;
    }
    
    return false;
  };

  const propertyRows = useMemo(() => {
    // Mostrar todas las propiedades, tengan o no turnos
    const base = properties;
    let filtered = selectedPropertyIds.length ? base.filter(p => selectedPropertyIds.includes(p.id)) : base;
    
    // Aplicar filtro de búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => {
        const searchLower = searchQuery.toLowerCase();
        return (p.alias?.toLowerCase().includes(searchLower)) ||
               (p.name?.toLowerCase().includes(searchLower));
      });
    }
    
    return filtered;
  }, [properties, selectedPropertyIds, searchQuery]);

  // Calcular gaps por propiedad y día
  const detectedGaps = useMemo(() => {
    const gaps = new Map<number, Set<string>>(); // propertyId -> Set of day strings with gaps
    
    propertyRows.forEach(property => {
      displayDays.forEach(day => {
        const dayKey = day.toISOString().split('T')[0];
        const dayShifts = filtered.filter(s => {
          if (!s.startTime || !s.endTime) return false;
          const shiftStart = new Date(s.startTime);
          const shiftEnd = new Date(s.endTime);
          const dayStart = startOfDay(day);
          const dayEnd = endOfDay(day);
          return s.property && Number(s.property) === property.id && shiftStart < dayEnd && shiftEnd > dayStart;
        });
        
        if (detectGaps(day, dayShifts)) {
          if (!gaps.has(property.id)) {
            gaps.set(property.id, new Set());
          }
          gaps.get(property.id)!.add(dayKey);
        }
      });
    });
    
    return gaps;
  }, [displayDays, filtered, propertyRows]);

  const guardRows = useMemo(() => {
    // Mostrar todos los guardias, tengan o no turnos
    const base = guards;
    let filtered = selectedGuardIds.length ? base.filter(g => selectedGuardIds.includes(g.id)) : base;
    
    // Aplicar filtro de búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(g => {
        const searchLower = searchQuery.toLowerCase();
        const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
        return fullName.includes(searchLower) ||
               g.firstName.toLowerCase().includes(searchLower) ||
               g.lastName.toLowerCase().includes(searchLower);
      });
    }
    
    return filtered;
  }, [guards, selectedGuardIds, searchQuery]);

  // Función para calcular estadísticas de un guardia en el rango filtrado
  const getGuardStats = (guardId: number) => {
    const guardShifts = filtered.filter(s => s.guard === guardId);
    const totalShifts = guardShifts.length;
    
    // Calcular horas totales
    const totalHours = guardShifts.reduce((sum, shift) => {
      if (!shift.startTime || !shift.endTime) return sum;
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return {
      shifts: totalShifts,
      hours: Math.round(totalHours * 10) / 10 // Redondear a 1 decimal
    };
  };

  // Función para calcular estadísticas de una propiedad en el rango filtrado
  const getPropertyStats = (propertyId: number) => {
    const propertyShifts = filtered.filter(s => s.property === propertyId);
    const totalShifts = propertyShifts.length;
    
    // Calcular horas totales
    const totalHours = propertyShifts.reduce((sum, shift) => {
      if (!shift.startTime || !shift.endTime) return sum;
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return {
      shifts: totalShifts,
      hours: Math.round(totalHours * 10) / 10 // Redondear a 1 decimal
    };
  };

  // Funciones para manejar hover y selección de columnas
  const handleColumnHover = (colIndex: number | null) => {
    if (rangeType === "week" || rangeType === "month") {
      setHoveredColumn(colIndex);
    }
  };

  const handleColumnClick = (colIndex: number) => {
    if (rangeType === "week" || rangeType === "month") {
      setSelectedColumn(selectedColumn === colIndex ? null : colIndex);
    }
  };

  // Funciones para actualizar datos cuando se cierran los modales
  const refreshTimelineData = () => {
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    queryClient.invalidateQueries({ queryKey: ["guards"] });
  };

  const handlePropertyModalClose = () => {
    setModalProperty(null);
    refreshTimelineData();
  };

  const handleGuardModalClose = () => {
    setModalGuard(null);
    refreshTimelineData();
  };

  const getColumnClasses = (colIndex: number, day?: Date) => {
    if (rangeType === "day") return "";
    
    const isHovered = hoveredColumn === colIndex;
    const isSelected = selectedColumn === colIndex;
    
    // Verificar si hay gaps en al menos una propiedad para este día
    let hasGap = false;
    if ((gapMode === "days" || gapMode === "all") && day) {
      const dayKey = day.toISOString().split('T')[0];
      // Buscar si alguna propiedad tiene gap en este día
      for (const [, gapDays] of detectedGaps) {
        if (gapDays.has(dayKey)) {
          hasGap = true;
          break;
        }
      }
    }
    
    if (hasGap) return "bg-yellow-100";
    if (isSelected) return "bg-primary/20";
    if (isHovered) return "bg-muted/50";
    return "";
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchQuery("");
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <Card className="flex-1 flex flex-col min-h-0 h-full" style={{margin: 0, padding: 0}}>
        <CardHeader style={{padding: 0, margin: 0, minHeight: 'auto', marginBottom: '-1.5rem'}}>
          <div className="flex items-center justify-between" style={{margin: 0, padding: '4px 8px 2px 8px'}}>
            {/* Dropdown a la izquierda */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="justify-center">
                  {view === "property" ? "Propiedades" : "Guardias"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setView("property")}>
                  Propiedades
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setView("guard")}>
                  Guardias
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dropdown para gaps - solo mostrar cuando no es vista de día y está en vista de propiedades */}
            {rangeType !== "day" && view === "property" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    {gapMode === "none" && "Sin gaps"}
                    {gapMode === "days" && "Gaps en días"}
                    {gapMode === "properties" && "Gaps en propiedades"}
                    {gapMode === "all" && "Todos los gaps"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setGapMode("none")}>
                    Sin gaps
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGapMode("days")}>
                    Gaps en días
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGapMode("properties")}>
                    Gaps en propiedades
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGapMode("all")}>
                    Todos los gaps
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Campo de búsqueda y botón limpiar a la derecha */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Buscar"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                disabled={!searchQuery.trim()}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0" style={{padding: 0, margin: 0, marginTop: '-2px'}}>
          <div className="h-full overflow-y-auto" style={{margin: 0, padding: 0, paddingTop: 0}}>
            <table className="w-full table-fixed text-sm" style={{margin: 0, padding: 0, marginTop: 0}}>
              <thead className="sticky top-0 bg-background z-10 border-b shadow-sm" style={{margin: 0, padding: 0}}>
                <tr className="bg-muted/50" style={{margin: 0, padding: 0}}>
                  <th className="text-left px-2 py-0.5 w-28 md:w-32 font-medium" style={{margin: 0, paddingTop: 0}}>{view === "property" ? "Propiedad" : "Guardia"}</th>
                  {displayDays.map((d, idx) => (
                    <th 
                      key={idx} 
                      className={`text-center px-1 py-0.5 font-medium cursor-pointer transition-colors ${getColumnClasses(idx, d)}`}
                      style={{margin: 0, paddingTop: 0}}
                      onMouseEnter={() => handleColumnHover(idx)}
                      onMouseLeave={() => handleColumnHover(null)}
                      onClick={() => handleColumnClick(idx)}
                    >
                      {rangeType === "month"
                        ? d.toLocaleDateString(undefined, { day: "numeric" })
                        : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view === "property" && (
                  <>
                    {propertyRows.map((p) => {
                      const stats = getPropertyStats(p.id);
                      const propertyHasGaps = (gapMode === "properties" || gapMode === "all") && detectedGaps.has(p.id) && detectedGaps.get(p.id)!.size > 0;
                      return (
                        <tr key={p.id} className={`align-top ${propertyHasGaps ? 'bg-yellow-50' : ''}`}>
                          <td className="px-2 py-1 w-28 md:w-32 align-top">
                            <button className="text-left hover:underline truncate w-full block cursor-pointer" onClick={() => setModalProperty({ id: p.id, name: p.name, selectedDate: undefined })}>
                              <div className="font-medium truncate">{p.alias || "\u00A0"}</div>
                              <div className="text-xs text-muted-foreground truncate">{p.name || `Prop ${p.id}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {stats.shifts} turnos • {stats.hours}h
                              </div>
                            </button>
                          </td>
                          {displayDays.map((d, idx) => (
                            <td 
                              key={idx} 
                              className={`px-1 py-1 align-middle transition-colors ${getColumnClasses(idx, d)}`}
                              onMouseEnter={() => handleColumnHover(idx)}
                              onMouseLeave={() => handleColumnHover(null)}
                              onClick={() => handleColumnClick(idx)}
                            >
                              <div 
                                className={`${rangeType === "month" ? "scale-[0.8] origin-left" : ""} cursor-pointer`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalProperty({ id: p.id, name: p.name, selectedDate: d });
                                }}
                              >
                                <CoverageBar 
                                  day={d} 
                                  shifts={byProperty[p.id] ?? []} 
                                  colorBy="guard"
                                  guards={guards}
                                  properties={properties}
                                  hasGap={(gapMode === "properties" || gapMode === "all") && detectedGaps.has(p.id) && detectedGaps.get(p.id)!.has(d.toISOString().split('T')[0])}
                                  showStats={true}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {propertyRows.length === 0 && (
                      <tr>
                        <td colSpan={1 + displayDays.length} className="px-2 py-6 text-center text-muted-foreground">No hay propiedades disponibles</td>
                      </tr>
                    )}
                  </>
                )}
                {view === "guard" && (
                  <>
                    {guardRows.map((g) => {
                      const stats = getGuardStats(g.id);
                      return (
                        <tr key={g.id} className="align-top">
                          <td className="px-2 py-1 w-28 md:w-32 align-top">
                            <button className="text-left hover:underline truncate w-full block cursor-pointer" onClick={() => setModalGuard({ id: g.id, name: `${g.firstName} ${g.lastName}`, selectedDate: undefined })}>
                              <div className="font-medium truncate">{g.firstName} {g.lastName}</div>
                              <div className="text-xs text-muted-foreground">
                                {stats.shifts} turnos • {stats.hours}h
                              </div>
                            </button>
                          </td>
                          {displayDays.map((d, idx) => (
                            <td 
                              key={idx} 
                              className={`px-1 py-1 align-middle transition-colors ${getColumnClasses(idx, d)}`}
                              onMouseEnter={() => handleColumnHover(idx)}
                              onMouseLeave={() => handleColumnHover(null)}
                              onClick={() => handleColumnClick(idx)}
                            >
                              <div 
                                className={`${rangeType === "month" ? "scale-[0.8] origin-left" : ""} cursor-pointer`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModalGuard({ id: g.id, name: `${g.firstName} ${g.lastName}`, selectedDate: d });
                                }}
                              >
                                <CoverageBar 
                                  day={d} 
                                  shifts={byGuard[g.id] ?? []} 
                                  colorBy="property"
                                  guards={guards}
                                  properties={properties}
                                  hasGap={(gapMode === "days" || gapMode === "all") && (() => {
                                    const dayKey = d.toISOString().split('T')[0];
                                    for (const [, gapDays] of detectedGaps) {
                                      if (gapDays.has(dayKey)) return true;
                                    }
                                    return false;
                                  })()}
                                  showStats={true}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {guardRows.length === 0 && (
                      <tr>
                        <td colSpan={1 + displayDays.length} className="px-2 py-6 text-center text-muted-foreground">No hay guardias disponibles</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Details - Shows day-specific information when a column is selected */}
      <TimelineDetails
        displayDays={displayDays}
        shifts={filtered}
        guards={guards}
        selectedColumn={selectedColumn}
      />

      {modalProperty && (
        <PropertyShiftsModalImproved
          propertyId={modalProperty.id}
          propertyName={modalProperty.name}
          open={true}
          onClose={handlePropertyModalClose}
          initialSelectedDate={modalProperty.selectedDate}
        />
      )}
      {modalGuard && (
        <GuardsShiftsModal
          guardId={modalGuard.id}
          guardName={modalGuard.name}
          open={true}
          onClose={handleGuardModalClose}
          initialSelectedDate={modalGuard.selectedDate}
        />
      )}
    </div>
  );
}
