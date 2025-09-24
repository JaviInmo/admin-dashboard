"use client";

import { Search, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type UiTextFragment = {
  guards?: {
    shiftsTitle?: string;
  };
  shifts?: {
    searchPlaceholder?: string;
  };
};

type Props = {
  TEXT?: UiTextFragment;
  guardName?: string;
  guardId: number;
  viewMode: "week" | "month" | "year";
  setViewMode: (m: "week" | "month" | "year") => void;
  propertySearch: string;
  setPropertySearch: (s: string) => void;
  days: Date[];
  moveBack: () => void;
  moveNext: () => void;
  goToday: () => void;
  onCreateClick: () => void;
};

/**
 * Pequeña util para interpolar {guardName} y {guardId} si vienen en el texto.
 */
function interpolate(text: string, vars: { guardName?: string; guardId?: number }) {
  return text
    .replace(/\{guardName\}/g, vars.guardName ?? "")
    .replace(/\{guardId\}/g, String(vars.guardId ?? ""));
}

export default function GuardShiftsHeader({
  TEXT,
  guardName,
  guardId,
  viewMode,
  setViewMode,
  propertySearch,
  setPropertySearch,
  days,
  moveBack,
  moveNext,
  goToday,
  onCreateClick,
}: Props) {
  // título: preferimos TEXT.guards.shiftsTitle si existe (puede incluir placeholders),
  // si no, fallback a `Turnos — ${guardName ?? `#${guardId}`}`
  const rawTitle = TEXT?.guards?.shiftsTitle;
  const title =
    typeof rawTitle === "string"
      ? interpolate(rawTitle, { guardName, guardId })
      : `Turnos — ${guardName ?? `#${guardId}`}`;

  const searchPlaceholder = TEXT?.shifts?.searchPlaceholder ?? "Buscar propiedades...";

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
            value={propertySearch}
            onChange={(e) => setPropertySearch(e.target.value)}
            className="text-sm outline-none w-48 "
          />
        </div>

        <div className="flex border rounded overflow-hidden">
          <Button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-3 py-1 text-sm transition-colors ${
              viewMode === "week" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Semana
          </Button>
          <Button
            type="button"
            onClick={() => setViewMode("month")}
            className={`px-3 py-1 text-sm transition-colors ${
              viewMode === "month" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Mes
          </Button>
          <Button
            type="button"
            onClick={() => setViewMode("year")}
            className={`px-3 py-1 text-sm transition-colors ${
              viewMode === "year" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            Año
          </Button>
        </div>

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
