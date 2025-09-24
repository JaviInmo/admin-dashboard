// src/components/Properties/properties shifts content/PropertyShiftsHeader.tsx

import { Search, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  TEXT?: UiTextFragment;
  propertyName?: string;
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
 * Pequeña util para interpolar {propertyName} y {propertyId} si vienen en el texto.
 */
function interpolate(text: string, vars: { propertyName?: string; propertyId?: number }) {
  return text
    .replace(/\{propertyName\}/g, vars.propertyName ?? "")
    .replace(/\{propertyId\}/g, String(vars.propertyId ?? ""));
}

export default function PropertyShiftsHeader({
  TEXT,
  propertyName,
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
}: Props) {
  // título: preferimos TEXT.properties.shiftsTitle si existe (puede incluir placeholders),
  // si no, fallback a `Turnos — ${propertyName ?? `#${propertyId}`}`
  const rawTitle = TEXT?.properties?.shiftsTitle;
  const title =
    typeof rawTitle === "string"
      ? interpolate(rawTitle, { propertyName, propertyId })
      : `Turnos — ${propertyName ?? `#${propertyId}`}`;

  const searchPlaceholder = TEXT?.shifts?.searchPlaceholder ?? "Buscar guardias...";

  return (
    <div className="flex items-start justify-between gap-3 w-full pt-4">
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5" />
        <div>
          <div className="text-base">{title}</div>
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
