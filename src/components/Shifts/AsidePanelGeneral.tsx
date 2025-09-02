"use client";
import { useShiftsFilters } from "@/contexts/shifts-context";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import TimelineCombined from "@/components/Shifts/TimelineCombined";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ChevronDown } from "lucide-react";


export default function AsidePanelGeneral() {
  const {
    rangeType, setRangeType,
    anchorDate, setAnchorDate,
  } = useShiftsFilters();

  // Nota: el cálculo de rangos se usa en KPISummaryInline y TimelineCombined

  // KPIs se calculan en el header (KPISummaryInline)

  // Funciones para el comportamiento del calendario según el rango
  const getWeekDays = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 }); // Domingo como inicio
    const end = endOfWeek(date, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  const getCalendarModifiers = () => {
    if (rangeType === "week" && anchorDate) {
      const weekDays = getWeekDays(anchorDate);
      
      return {
        weekSelected: weekDays,
      };
    }
    return {};
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (rangeType === "month") {
      // En modo mes, solo cambiar el mes mostrado, no seleccionar días
      // Pero sí actualizar anchorDate para cambiar el mes visible
      setAnchorDate(date);
      return;
    }
    
    setAnchorDate(date);
  };

  const handleMonthChange = (month: Date) => {
    // Permitir navegación de mes siempre, especialmente en modo mes
    setAnchorDate(month);
  };

  const isDateDisabled = (_date: Date) => {
    // En modo mes, deshabilitar la selección de días individuales
    // pero permitir la navegación del mes
    return rangeType === "month";
  };

  const handleQuick = (key: "today" | "thisWeek" | "thisMonth") => {
    if (key === "today") { setRangeType("day"); setAnchorDate(new Date()); }
    else if (key === "thisWeek") { setRangeType("week"); setAnchorDate(new Date()); }
    else { setRangeType("month"); setAnchorDate(new Date()); }
  };

  return (
    <aside className="w-full space-y-4">
      {/* Intermedia: Calendario (izquierda) sin contenedor + Timeline (derecha) */}
      <div className="flex flex-col md:flex-row gap-4 items-start h-full min-h-0">
        <div className="basis-full md:basis-[20%] md:max-w-[20%] flex-shrink-0 space-y-3">
          {/* Calendario */}
          <Calendar
            mode="single"
            selected={rangeType === "month" ? undefined : anchorDate}
            month={anchorDate}
            onSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
            disabled={isDateDisabled}
            modifiers={getCalendarModifiers()}
            modifiersClassNames={{
              weekSelected: "bg-primary/20 hover:bg-primary/30",
            }}
            weekStartsOn={0}
            className="rounded-md border w-full"
          />
          
          {/* Sección inferior del calendario */}
          <div className="space-y-2">
            {/* Dropdown de rango */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-center">
                  {rangeType === "day" ? "Día" : rangeType === "week" ? "Semana" : "Mes"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuItem onSelect={() => setRangeType("day")}>Día</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRangeType("week")}>Semana</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRangeType("month")}>Mes</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Botones de navegación rápida */}
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-auto" onClick={() => handleQuick("today")}>
                Hoy
              </Button>
              <Button size="sm" variant="outline" className="flex-auto" onClick={() => handleQuick("thisWeek")}>
                Esta semana
              </Button>
              <Button size="sm" variant="outline" className="flex-auto" onClick={() => handleQuick("thisMonth")}>
                Este mes
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 h-full min-h-0 flex flex-col">
          <TimelineCombined />
        </div>
      </div>

  {/* KPIs movidos al header de la página */}
    </aside>
  );
}
