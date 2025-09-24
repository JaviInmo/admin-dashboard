// src/components/Properties/properties shifts content/PropertyShiftsHeader.tsx

import * as React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Service = {
  id: number;
  name: string;
  startTime: string | null;
  endTime: string | null;
};

type Props = {
  TEXT?: UiTextFragment;
  propertyName?: string;
  propertyAlias?: string;
  propertyId: number;
  viewMode: "week" | "month" | "year";
  setViewMode: (m: "week" | "month" | "year") => void;
  guardSearch: string;
  setGuardSearch: (s: string) => void;
  days: Date[];
  moveBack: () => void;
  moveNext: () => void;
  goToday: () => void;
  onCreateClick: () => void;
  services: Service[];
  selectedServiceId: number | null;
  onServiceChange: (serviceId: number | null) => void;
  selectedMonth?: Date;
  onMonthChange?: (month: Date) => void;
};

/**
 * Tipo reducido que cubre solo las claves que usa este componente.
 * Evita el uso de `any` pero sigue siendo compatible con tus objetos de texto completos.
 */
type UiTextFragment = {
  properties?: {
    shiftsTitle?: string;
  };
  shifts?: {
    searchPlaceholder?: string;
  };
};

/**
 * Pequeña util para interpolar {propertyName}, {propertyAlias} y {propertyId} si vienen en el texto.
 */
function interpolate(text: string, vars: { propertyName?: string; propertyAlias?: string; propertyId?: number }) {
  return text
    .replace(/\{propertyName\}/g, vars.propertyName ?? "")
    .replace(/\{propertyAlias\}/g, vars.propertyAlias ?? "")
    .replace(/\{propertyId\}/g, String(vars.propertyId ?? ""));
}

/**
 * Formatea una hora en formato 12 horas (AM/PM)
 */
function formatTime12Hour(timeString: string | null): string {
  if (!timeString) return "";
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convertir 0 a 12 para medianoche
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
}

export default function PropertyShiftsHeader({
  TEXT,
  propertyName,
  propertyAlias,
  propertyId,
  viewMode,
  setViewMode,
  guardSearch,
  setGuardSearch,
  days,
  moveBack,
  moveNext,
  goToday,
  onCreateClick,
  services,
  selectedServiceId,
  onServiceChange,
  selectedMonth,
  onMonthChange,
}: Props) {
  // título: preferimos TEXT.properties.shiftsTitle si existe (puede incluir placeholders),
  // si no, fallback a `${propertyAlias ?? 'Alias'} - ${propertyName ?? `#${propertyId}`}`
  const rawTitle = TEXT?.properties?.shiftsTitle;
  const title =
    typeof rawTitle === "string"
      ? interpolate(rawTitle, { propertyName, propertyAlias, propertyId })
      : `${propertyAlias ?? 'Alias'} - ${propertyName ?? `#${propertyId}`}`;

  const searchPlaceholder = TEXT?.shifts?.searchPlaceholder ?? "Buscar guardias...";

  // Generar opciones de meses (solo del año actual)
  const monthOptions = React.useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    
    // Solo meses del año actual
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentYear, month, 1);
      options.push({
        value: date.toISOString(),
        label: date.toLocaleDateString('es-ES', { month: 'long' })
      });
    }
    
    return options;
  }, []);

  return (
    <div className="flex items-start justify-between gap-3 w-full pt-4">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base">{title}</div>
            <Select 
              value={selectedServiceId?.toString() ?? "all"} 
              onValueChange={(value) => onServiceChange(value === "all" ? null : Number(value))}
            >
              <SelectTrigger className="w-40 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name} {service.startTime && service.endTime ? `(${formatTime12Hour(service.startTime)}-${formatTime12Hour(service.endTime)})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {/* resumen de periodo (si days vacío, evitamos crash) */}
            {days && days.length > 0 ? (
              days.length > 1
                ? `${days[0].toLocaleDateString()} — ${days[days.length - 1].toLocaleDateString()}`
                : days[0].toLocaleDateString()
            ) : (
              ""
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 border rounded px-2 py-1 bg-white">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={guardSearch}
            onChange={(e) => setGuardSearch(e.target.value)}
            className="text-sm outline-none w-48 "
          />
        </div>

        {onMonthChange && (
          <Select 
            value={selectedMonth?.toISOString() ?? ""} 
            onValueChange={(value) => {
              if (value) {
                onMonthChange(new Date(value));
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={viewMode} onValueChange={(value) => setViewMode(value as "week" | "month" | "year")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="month">Mes</SelectItem>
            <SelectItem value="year">Año</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={moveBack} title="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} title="Hoy">
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={moveNext} title="Siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div>
          <Button onClick={onCreateClick}>Crear turno</Button>
        </div>
      </div>
    </div>
  );
}
