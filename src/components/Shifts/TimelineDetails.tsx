"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { Shift } from "@/components/Shifts/types";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TimelineDetailsProps = {
  displayDays: Date[];
  shifts: Shift[];
  guards: Guard[];
  properties: AppProperty[];
  selectedColumn: number | null;
  view: "property" | "guard";
};

export default function TimelineDetails({ displayDays, shifts, guards, properties, selectedColumn }: Omit<TimelineDetailsProps, 'view'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Nuevo: cache de propiedades
  // const { getFromCache } = usePropertiesCache();

  // Create guard map for quick lookup
  const guardMap = useMemo(() => {
    const map = new Map<number, Guard>();
    guards.forEach(guard => map.set(guard.id, guard));
    return map;
  }, [guards]);

  // Create property map for quick lookup
  const propertyMap = useMemo(() => {
    const map = new Map<number, AppProperty>();
    properties.forEach(property => map.set(property.id, property));
    return map;
  }, [properties]);

  // Get shifts for the selected day, grouped by property
  const shiftsByProperty = useMemo(() => {
    if (selectedColumn === null || selectedColumn >= displayDays.length) return new Map();
    
    const selectedDate = displayDays[selectedColumn];
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayShifts = shifts.filter(shift => {
      if (!shift.startTime) return false;
      const shiftStart = new Date(shift.startTime);
      return shiftStart >= dayStart && shiftStart <= dayEnd;
    });

    // Group shifts by property
    const grouped = new Map<number, Shift[]>();
    dayShifts.forEach(shift => {
      if (shift.property) {
        if (!grouped.has(shift.property)) {
          grouped.set(shift.property, []);
        }
        grouped.get(shift.property)!.push(shift);
      }
    });

    return grouped;
  }, [selectedColumn, displayDays, shifts]);

  // Check for overlaps with timeline
  useEffect(() => {
    if (selectedColumn === null || shiftsByProperty.size === 0) {
      setShowDetails(false);
      return;
    }

    const checkOverlap = () => {
      if (!containerRef.current || !detailsRef.current) return false;

      // Get the timeline table
      const timelineTable = containerRef.current.querySelector('table');
      if (!timelineTable) return false;
      
      const tableRect = timelineTable.getBoundingClientRect();
      const detailsRect = detailsRef.current.getBoundingClientRect();
      
      // Check if details would overlap with table
      const wouldOverlap = (detailsRect.top < tableRect.bottom + 10); // 10px margin
      
      return !wouldOverlap;
    };

    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      setShowDetails(checkOverlap());
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedColumn, shiftsByProperty]);

  if (selectedColumn === null || shiftsByProperty.size === 0 || !showDetails) {
    return null;
  }

  const selectedDate = displayDays[selectedColumn];
  const totalHours = Array.from(shiftsByProperty.values()).flat().reduce((sum, shift) => sum + (shift.hoursWorked || 0), 0);
  const totalShifts = Array.from(shiftsByProperty.values()).flat().length;

  return (
    <div ref={containerRef} className="w-full">
      <Card className="mt-4" ref={detailsRef}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Detalles - {selectedDate.toLocaleDateString(undefined, { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {totalShifts} turno{totalShifts !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline">
                  {totalHours.toFixed(1)} horas
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              {Array.from(shiftsByProperty.entries()).map(([propertyId, propertyShifts]) => {
                const property = propertyMap.get(propertyId);
                const propertyHours = propertyShifts.reduce((sum: number, shift: Shift) => sum + (shift.hoursWorked || 0), 0);
                
                return (
                  <div key={propertyId} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">
                        {property ? property.name : `Propiedad ${propertyId}`}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {propertyShifts.length} guardia{propertyShifts.length !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {propertyHours.toFixed(1)}h total
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {propertyShifts.map((shift: Shift) => {
                        const guard = guardMap.get(shift.guard);
                        const startTime = shift.startTime ? new Date(shift.startTime).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '--:--';
                        const endTime = shift.endTime ? new Date(shift.endTime).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '--:--';
                        
                        return (
                          <div key={shift.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-xs">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    shift.status === "completed" ? "default" : 
                                    shift.status === "scheduled" ? "secondary" : 
                                    "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {shift.status === "completed" ? "Completado" : 
                                   shift.status === "scheduled" ? "Programado" : 
                                   "Cancelado"}
                                </Badge>
                                {guard && (
                                  <span className="font-medium">
                                    {guard.firstName} {guard.lastName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {startTime} - {endTime}
                              </span>
                              <span className="font-medium">
                                {shift.hoursWorked?.toFixed(1) || '0.0'}h
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
