"use client";

import * as React from "react";
import type { Shift } from "@/components/Shifts/types";

type ShiftApi = Shift & {
  planned_start_time?: string | null;
  planned_end_time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type SimpleProperty = {
  id: number;
  name: string;
  alias?: string;
  address?: string;
};

type Props = {
  days: Date[];
  propertiesFiltered: SimpleProperty[];
  // ahora usamos ShiftApi en lugar de Shift dentro del map/record
  shiftsByPropertyAndDate: Map<number, Record<string, ShiftApi[]>>;
  openCreateForDate: (d: Date, property?: SimpleProperty | null) => void;
  setActionShift: (s: Shift | null) => void;
  loading: boolean;
  error: string | null;
  dayColMinWidth: number;
  tableMinWidth: number;
  bodyMaxHeight?: string | number | undefined;
  rowHeight: number;
  outerWrapperRef: React.RefObject<HTMLDivElement | null>;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoToLocalTime(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}

export default function GuardShiftsTable({
  days,
  propertiesFiltered,
  shiftsByPropertyAndDate,
  openCreateForDate,
  setActionShift,
  loading,
  error,
  dayColMinWidth,
  tableMinWidth,
  bodyMaxHeight,
  rowHeight,
  outerWrapperRef,
}: Props) {
  const FIRST_COL_WIDTH = 200;
  const rightMinWidth = Math.max(0, tableMinWidth - FIRST_COL_WIDTH);

  const headerRightRef = React.useRef<HTMLDivElement | null>(null);
  const bodyRightRef = React.useRef<HTMLDivElement | null>(null);
  const horizontalScrollbarRef = React.useRef<HTMLDivElement | null>(null);

  // cuando se desplaza el body, sincronizamos header + mirror
  const onBodyScroll = React.useCallback(() => {
    if (!bodyRightRef.current) return;
    const left = bodyRightRef.current.scrollLeft;
    if (headerRightRef.current) headerRightRef.current.scrollLeft = left;
    if (horizontalScrollbarRef.current) horizontalScrollbarRef.current.scrollLeft = left;
  }, []);

  // cuando se desplaza el mirror, sincronizamos body + header
  const onMirrorScroll = React.useCallback(() => {
    if (!horizontalScrollbarRef.current) return;
    const left = horizontalScrollbarRef.current.scrollLeft;
    if (bodyRightRef.current) bodyRightRef.current.scrollLeft = left;
    if (headerRightRef.current) headerRightRef.current.scrollLeft = left;
  }, []);

  // inicializamos scrollLeft a 0 cuando cambian columnas
  React.useEffect(() => {
    if (bodyRightRef.current) bodyRightRef.current.scrollLeft = 0;
    if (headerRightRef.current) headerRightRef.current.scrollLeft = 0;
    if (horizontalScrollbarRef.current) horizontalScrollbarRef.current.scrollLeft = 0;
  }, [days.length, tableMinWidth]);

  return (
    <div className="mt-4">
      {loading ? (
        <div className="p-4">Cargando...</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : (
        <div className="rounded-lg border bg-white" ref={outerWrapperRef}>
          {/* HEADER (fuera del scroll vertical) */}
          <div className="flex items-stretch border-b bg-gray-50">
            {/* Cabecera izquierda */}
            <div
              style={{
                width: FIRST_COL_WIDTH,
                minWidth: FIRST_COL_WIDTH,
                maxWidth: FIRST_COL_WIDTH,
              }}
              className="border-r px-2 py-2 flex items-center font-bold text-left"
            >
              Propiedades
            </div>

            {/* Cabecera derecha (scrollable horizontalmente) */}
            <div
              className="flex-1 overflow-hidden"
              style={{ minWidth: 0 }}
              ref={headerRightRef}
            >
              <div style={{ minWidth: rightMinWidth }} className="flex">
                {days.map((d) => {
                  const label = d.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "numeric",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={d.toISOString()}
                      className="border-l px-2 py-2 text-center font-bold"
                      style={{ minWidth: dayColMinWidth }}
                    >
                      <div className="text-xs">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BODY: único contenedor con scroll vertical (así ambas columnas se mueven en Y) */}
          <div
            style={{ maxHeight: bodyMaxHeight, overflowY: "auto" }}
            className="flex"
          >
            {/* Columna izquierda: sticky left para evitar que se desplace en X,
                background y z-index para que no quede tapada por la derecha */}
            <div
              style={{
                width: FIRST_COL_WIDTH,
                minWidth: FIRST_COL_WIDTH,
                maxWidth: FIRST_COL_WIDTH,
              }}
              className="sticky left-0 z-30 bg-white border-r"
            >
              <div>
                {propertiesFiltered.length === 0 ? (
                  <div
                    className="p-4 text-sm text-muted-foreground"
                    style={{ height: rowHeight }}
                  >
                    No hay propiedades en el rango seleccionado.
                  </div>
                ) : (
                  <div>
                    {propertiesFiltered.map((p) => (
                      <div
                        key={p.id}
                        data-property-row={`property-${p.id}`}
                        className="border-b px-2 py-2 flex items-center justify-between gap-2"
                        style={{ height: rowHeight }}
                      >
                        <div className="text-sm truncate text-black">{p.name ?? p.alias ?? `#${p.id}`}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Area derecha: scrollbar horizontal aquí; vertical lo maneja el padre */}
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div
                className="overflow-x-auto hide-horizontal-scrollbar"
                style={{ overflowY: "hidden" }}
                ref={bodyRightRef}
                onScroll={onBodyScroll}
              >
                <div style={{ minWidth: rightMinWidth }}>
                  {propertiesFiltered.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground"></div>
                  ) : (
                    <div>
                      {propertiesFiltered.map((p) => (
                        <div
                          key={p.id}
                          className="flex border-b hover:bg-muted/5"
                          style={{ height: rowHeight }}
                        >
                          {days.map((d) => {
                            const key = `${d.getFullYear()}-${pad(
                              d.getMonth() + 1
                            )}-${pad(d.getDate())}`;
                            const rec =
                              shiftsByPropertyAndDate.get(p.id)?.[key] ?? [];
                            if (!rec || rec.length === 0) {
                              return (
                                <div
                                  key={key}
                                  className="border-l px-2 py-2 text-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/5 select-none"
                                  style={{
                                    minWidth: dayColMinWidth,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  onClick={() => openCreateForDate(d, p)}
                                >
                                  +
                                </div>
                              );
                            }
                            return (
                              <div
                                key={key}
                                className="border-l px-2 py-2 text-center align-top"
                                style={{
                                  minWidth: dayColMinWidth,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {rec.map((s: ShiftApi) => {
                                    const startIso =
                                      s.plannedStartTime ??
                                      s.planned_start_time ??
                                      s.startTime ??
                                      s.start_time ??
                                      null;
                                    const endIso =
                                      s.plannedEndTime ??
                                      s.planned_end_time ??
                                      s.endTime ??
                                      s.end_time ??
                                      null;
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        className="text-xs underline decoration-dotted hover:bg-muted/10 px-1 rounded"
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          setActionShift(s);
                                        }}
                                      >
                                        {`${isoToLocalTime(startIso)} — ${isoToLocalTime(
                                          endIso
                                        )}`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MIRROR HORIZONTAL SCROLLBAR: siempre visible (sticky bottom) */}
          <div
            ref={horizontalScrollbarRef}
            className="overflow-x-auto"
            // sticky bottom para que quede siempre a la vista; ajustar z-index si es necesario
            style={{
              overflowY: "hidden",
              position: "sticky",
              bottom: 0,
              height: 12,
            }}
            onScroll={onMirrorScroll}
          >
            {/* spacer: controla la anchura del scrollbar */}
            <div style={{ minWidth: rightMinWidth, height: 1 }} />
          </div>
        </div>
      )}
    </div>
  );
}
