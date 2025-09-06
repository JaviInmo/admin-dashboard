"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { Shift } from "@/components/Shifts/types";
import type { Guard } from "@/components/Guards/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TimelineDetailsProps = {
  displayDays: Date[];
  shifts: Shift[];
  guards: Guard[];
  selectedColumn: number | null;
  view: "property" | "guard";
};

export default function TimelineDetails({ displayDays, shifts, guards, selectedColumn }: Omit<TimelineDetailsProps, 'view'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Create guard map for quick lookup
  const guardMap = useMemo(() => {
    const map = new Map<number, Guard>();
    guards.forEach(guard => map.set(guard.id, guard));
    return map;
  }, [guards]);

  // Get shifts for the selected day
  const selectedDayShifts = useMemo(() => {
    if (selectedColumn === null || selectedColumn >= displayDays.length) return [];
    
    const selectedDate = displayDays[selectedColumn];
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.startTime);
      return shiftStart >= dayStart && shiftStart <= dayEnd;
    });
  }, [selectedColumn, displayDays, shifts]);

  // Check for overlaps with timeline
  useEffect(() => {
    if (selectedColumn === null || selectedDayShifts.length === 0) {
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
  }, [selectedColumn, selectedDayShifts]);

  if (selectedColumn === null || selectedDayShifts.length === 0 || !showDetails) {
    return null;
  }

  const selectedDate = displayDays[selectedColumn];
  const totalHours = selectedDayShifts.reduce((sum, shift) => sum + (shift.hoursWorked || 0), 0);

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
                  {selectedDayShifts.length} turno{selectedDayShifts.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline">
                  {totalHours.toFixed(1)} horas
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              {selectedDayShifts.map((shift) => {
                const guard = guardMap.get(shift.guard);
                const startTime = new Date(shift.startTime).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const endTime = new Date(shift.endTime).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div key={shift.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-xs">
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
        </CardContent>
      </Card>
    </div>
  );
}
