"use client";

import * as React from "react";
import { MessageCircle, Mail } from "lucide-react";
import { GiPistolGun } from "react-icons/gi";
import type { Shift } from "@/components/Shifts/types";
import GuardShiftsModal from "@/components/Guards/guard shifts content/GuardShiftsModal";
import { getDayCoverageInfo } from "./coverageGaps";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";

type ShiftApi = Shift & {
  planned_start_time?: string | null;
  planned_end_time?: string | null;
};

type SimpleGuard = {
  id: number;
  name: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type Props = {
  days: Date[];
  guardsFiltered: SimpleGuard[];
  // ahora usamos ShiftApi en lugar de Shift dentro del map/record
  shiftsByGuardAndDate: Map<number, Record<string, ShiftApi[]>>;
  openCreateForDate: (d: Date, guard?: SimpleGuard | null) => void;
  setActionShift: (s: Shift | null) => void;
  loading: boolean;
  error: string | null;
  dayColMinWidth: number;
  tableMinWidth: number;
  bodyMaxHeight?: string | number | undefined;
  rowHeight: number;
  outerWrapperRef: React.RefObject<HTMLDivElement | null>;
  selectedService?: {
    id: number;
    name: string;
    startTime: string | null;
    endTime: string | null;
    schedule: string[] | null;
  } | null;
  services: Array<{
    id: number;
    name: string;
    startTime: string | null;
    endTime: string | null;
    schedule: string[] | null;
  }>;
  onDayHover?: (day: Date | null) => void;
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

export default function PropertyShiftsTable({
  days,
  guardsFiltered,
  shiftsByGuardAndDate,
  openCreateForDate,
  setActionShift,
  loading,
  error,
  dayColMinWidth,
  tableMinWidth,
  bodyMaxHeight,
  rowHeight,
  outerWrapperRef,
  selectedService,
  services,
  onDayHover,
}: Props) {
  const { TEXT } = useI18n();
  const navigate = useNavigate();
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

  // Función para determinar si un día debe estar marcado en amarillo y obtener las brechas
  const getDayCoverageInfoCallback = React.useCallback((day: Date) => {
    return getDayCoverageInfo(day, selectedService || null, services, shiftsByGuardAndDate);
  }, [selectedService, services, shiftsByGuardAndDate]);

  const [guardShiftsModal, setGuardShiftsModal] = React.useState<{ guardId: number; guardName: string } | null>(null);

  return (
    <div className="mt-4">
      {loading ? (
        <div className="p-4">{TEXT?.common?.loading ?? "Loading..."}</div>
      ) : error ? (
        <div className="p-4 text-sm text-red-600">{error}</div>
      ) : (
        <div className="rounded-lg border bg-card" ref={outerWrapperRef}>
          {/* HEADER (fuera del scroll vertical) */}
          <div className="flex items-stretch border-b bg-muted/50">
            {/* Cabecera izquierda */}
            <div
              style={{
                width: FIRST_COL_WIDTH,
                minWidth: FIRST_COL_WIDTH,
                maxWidth: FIRST_COL_WIDTH,
              }}
              className="border-r px-2 py-2 flex items-center font-bold text-left"
            >
              {TEXT?.guards?.table?.title ?? "Guards"}
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
                  const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
                  const coverageInfo = getDayCoverageInfoCallback(d);
                  const shouldHighlight = coverageInfo.shouldHighlight;
                  return (
                    <div
                      key={d.toISOString()}
                      data-date={dateKey}
                      className={`border-l px-2 py-2 text-center font-bold flex-1 ${
                        shouldHighlight ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''
                      }`}
                      style={{ minWidth: dayColMinWidth }}
                      onMouseEnter={() => onDayHover?.(d)}
                      onMouseLeave={() => onDayHover?.(null)}
                    >
                      <div className="text-xs">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BODY: altura fija para mantener consistencia del modal */}
          <div
            style={{ height: bodyMaxHeight, overflowY: "auto" }}
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
                {guardsFiltered.length === 0 ? (
                  <div
                    className="p-4 text-sm text-muted-foreground"
                    style={{ height: rowHeight }}
                  >
                    {TEXT?.shifts?.noShiftsInRange ?? "No shifts/guards in the selected range."}
                  </div>
                ) : (
                  <div>
                    {guardsFiltered.map((g) => (
                      <div
                        key={g.id}
                        data-guard-row={`guard-${g.id}`}
                        className="border-b px-2 py-2 flex items-center justify-between gap-2"
                        style={{ height: rowHeight }}
                      >
                        <div className="text-sm truncate text-black cursor-pointer hover:text-blue-600 hover:underline" onClick={() => navigate('/guards', { state: { openGuardShifts: g.id, guardName: g.name } })}>{g.name}</div>
                        <div className="flex gap-1">
                          {g.phone && (
                            <a
                              href={`https://wa.me/${g.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-800"
                              title={`Contactar por WhatsApp: ${g.phone}`}
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}
                          {g.email && (
                            <a
                              href={`mailto:${g.email}`}
                              className="text-blue-600 hover:text-blue-800"
                              title={`Enviar email: ${g.email}`}
                            >
                              <Mail size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Espacio vacío para mantener altura fija del modal */}
                    {(() => {
                      const totalRowsHeight = guardsFiltered.length * rowHeight;
                      const remainingHeight = Math.max(0, (bodyMaxHeight as number) - totalRowsHeight);
                      return remainingHeight > 0 ? (
                        <div style={{ height: remainingHeight }} />
                      ) : null;
                    })()}
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
                  {guardsFiltered.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground"></div>
                  ) : (
                    <div>
                      {guardsFiltered.map((g) => (
                        <div
                          key={g.id}
                          className="flex border-b hover:bg-muted/5"
                          style={{ height: rowHeight }}
                        >
                          {days.map((d) => {
                            const key = `${d.getFullYear()}-${pad(
                              d.getMonth() + 1
                            )}-${pad(d.getDate())}`;
                            const rec =
                              shiftsByGuardAndDate.get(g.id)?.[key] ?? [];
                            const coverageInfo = getDayCoverageInfoCallback(d);
                            const shouldHighlight = coverageInfo.shouldHighlight;
                            if (!rec || rec.length === 0) {
                              return (
                                <div
                                  key={key}
                                  className={`border-l px-2 py-2 text-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/5 select-none flex-1 ${
                                    shouldHighlight ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                                  }`}
                                  style={{
                                    minWidth: dayColMinWidth,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  onClick={() => openCreateForDate(d, g)}
                                  onMouseEnter={() => onDayHover?.(d)}
                                  onMouseLeave={() => onDayHover?.(null)}
                                >
                                  +
                                </div>
                              );
                            }
                            return (
                              <div
                                key={key}
                                className={`border-l px-2 py-2 text-center align-top flex-1 ${
                                  shouldHighlight ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                                }`}
                                style={{
                                  minWidth: dayColMinWidth,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onMouseEnter={() => onDayHover?.(d)}
                                onMouseLeave={() => onDayHover?.(null)}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {rec.map((s: ShiftApi) => {
                                    const startIso =
                                      s.plannedStartTime ??
                                      s.planned_start_time ??
                                      s.startTime ??
                                      null;
                                    const endIso =
                                      s.plannedEndTime ??
                                      s.planned_end_time ??
                                      s.endTime ??
                                      null;
                                    return (
                                      <button
                                        key={s.id}
                                        type="button"
                                        className="text-xs underline decoration-dotted hover:bg-muted/10 px-1 rounded cursor-pointer w-full flex items-center justify-center gap-1"
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          setActionShift(s);
                                          // Directly open edit modal
                                          // Note: This assumes setOpenEdit is passed or handled in parent
                                          // For now, we'll keep the action dialog, but user wants direct edit
                                        }}
                                      >
                                        <span>
                                          {`${isoToLocalTime(startIso)}-${isoToLocalTime(
                                            endIso
                                          )}`}
                                        </span>
                                        {(s.isArmed === true) && (
                                          <GiPistolGun className="h-3 w-3 text-red-600 flex-shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {/* Espacio vacío para mantener altura fija del modal */}
                      {(() => {
                        const totalRowsHeight = guardsFiltered.length * rowHeight;
                        const remainingHeight = Math.max(0, (bodyMaxHeight as number) - totalRowsHeight);
                        return remainingHeight > 0 ? (
                          <div style={{ height: remainingHeight }} />
                        ) : null;
                      })()}
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
              // pequeño alto para que se vea sólo la scrollbar en la mayoría de browsers
              height: 12,
              // asegurar que el espejo tenga la misma anchura interior que la tabla derecha
            }}
            onScroll={onMirrorScroll}
          >
            {/* spacer: controla la anchura del scrollbar */}
            <div style={{ minWidth: rightMinWidth, height: 1 }} />
          </div>
        </div>
      )}

      {/* Modal de turnos del guardia */}
      {guardShiftsModal && (
        <GuardShiftsModal
          guardId={guardShiftsModal.guardId}
          guardName={guardShiftsModal.guardName}
          open={!!guardShiftsModal}
          onClose={() => setGuardShiftsModal(null)}
        />
      )}
    </div>
  );
}
