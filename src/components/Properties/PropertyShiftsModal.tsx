// src/components/Properties/PropertyShiftsModal.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listShiftsByProperty } from "@/lib/services/shifts";
import type { Shift } from "@/components/Shifts/types";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Calendar, ChevronLeft, ChevronRight, Search } from "lucide-react";

import CreateShift from "@/components/Shifts/Create/Create";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";

// shadcn table components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  propertyId: number;
  propertyName?: string;
  open: boolean;
  onClose: () => void;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoToLocalDateKey(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

export default function PropertyShiftsModal({
  propertyId,
  propertyName,
  open,
  onClose,
}: Props) {
  const { TEXT } = useI18n();

  const [loading, setLoading] = React.useState(false);
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [startDate, setStartDate] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [viewMode, setViewMode] = React.useState<"week" | "month" | "year">(
    "week"
  );

  const [guardSearch, setGuardSearch] = React.useState<string>("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createDate, setCreateDate] = React.useState<Date | null>(null);
  const [createGuardId, setCreateGuardId] = React.useState<number | null>(null);

  const [actionShift, setActionShift] = React.useState<Shift | null>(null);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  const preselectedPropertyObj = React.useMemo(() => {
    return {
      id: propertyId,
      ownerId: 0,
      name: propertyName ?? "",
      alias: undefined,
      address: propertyName ?? "",
      description: null,
      contractStartDate: null,
      createdAt: null,
      updatedAt: null,
    } as const;
  }, [propertyId, propertyName]);

  const preloadedPropertiesArray = React.useMemo(() => {
    return [
      {
        id: propertyId,
        ownerId: 0,
        name: propertyName ?? "",
        alias: undefined,
        address: propertyName ?? "",
        description: null,
        contractStartDate: null,
        createdAt: null,
        updatedAt: null,
      },
    ];
  }, [propertyId, propertyName]);

  const fetchShifts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listShiftsByProperty(
        propertyId,
        1,
        1000,
        "planned_start_time"
      );
      const items: Shift[] =
        (res as any)?.items ??
        (res as any)?.results ??
        (Array.isArray(res) ? res : res?.data?.results ?? []);
      setShifts(items as Shift[]);
    } catch (err) {
      console.error("Error fetching shifts by property:", err);
      setError(
        (TEXT as any)?.shifts?.errors?.fetchFailed ??
          "No se pudieron cargar los turnos"
      );
      toast.error(
        (TEXT as any)?.shifts?.errors?.fetchFailed ?? "Could not load shifts"
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId, TEXT]);

  React.useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchShifts();
    })();
    return () => {
      mounted = false;
    };
  }, [open, propertyId, fetchShifts]);

  const guardsAll = React.useMemo(() => {
    const map = new Map<
      number,
      {
        id: number;
        name: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      }
    >();
    shifts.forEach((s) => {
      const gid = Number(s.guard ?? (s.guardDetails as any)?.id ?? -1);
      if (gid === -1 || Number.isNaN(gid)) return;
      let name = (s.guardName as string) ?? (s.guardDetails as any)?.name ?? "";
      let firstName = undefined;
      let lastName = undefined;
      let email = undefined;
      const gd = s.guardDetails as any;
      if (gd) {
        firstName = gd.first_name ?? gd.firstName ?? undefined;
        lastName = gd.last_name ?? gd.lastName ?? undefined;
        email = gd.email ?? undefined;
        if (!name)
          name = `${firstName ?? ""}${lastName ? ` ${lastName}` : ""}`.trim();
      }
      if (!name) name = `#${gid}`;
      if (!map.has(gid))
        map.set(gid, {
          id: gid,
          name: name.trim() || `#${gid}`,
          firstName,
          lastName,
          email,
        });
    });
    return Array.from(map.values());
  }, [shifts]);

  const guardsFiltered = React.useMemo(() => {
    const q = (guardSearch ?? "").trim().toLowerCase();
    if (q === "") return guardsAll;
    return guardsAll.filter((g) => {
      return (
        (g.name ?? "").toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q) ||
        String(g.id).includes(q)
      );
    });
  }, [guardsAll, guardSearch]);

  const days = React.useMemo(() => {
    if (viewMode === "week") {
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return d;
      });
    }
    if (viewMode === "month") {
      const y = startDate.getFullYear();
      const m = startDate.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      return Array.from({ length: daysInMonth }).map((_, i) => {
        const d = new Date(y, m, i + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      });
    }
    const y = startDate.getFullYear();
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    const arr: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      arr.push(new Date(d));
    }
    return arr;
  }, [startDate, viewMode]);

  const shiftsByGuardAndDate = React.useMemo(() => {
    const out = new Map<number, Record<string, Shift[]>>();
    shifts.forEach((s) => {
      const gid = Number(s.guard ?? (s.guardDetails as any)?.id ?? -1);
      if (gid === -1 || Number.isNaN(gid)) return;
      const startIso = (s.plannedStartTime ??
        (s as any).planned_start_time ??
        null) as string | null;
      const dateKey =
        isoToLocalDateKey(startIso) ??
        isoToLocalDateKey(s.startTime ?? (s as any).start_time ?? null);
      if (!dateKey) return;
      if (!out.has(gid)) out.set(gid, {});
      const rec = out.get(gid)!;
      rec[dateKey] = rec[dateKey] ?? [];
      rec[dateKey].push(s);
    });
    out.forEach((rec) => {
      Object.keys(rec).forEach((k) => {
        rec[k].sort((a, b) => {
          const ta = new Date(
            a.plannedStartTime ??
              (a as any).planned_start_time ??
              a.startTime ??
              0
          ).getTime();
          const tb = new Date(
            b.plannedStartTime ??
              (b as any).planned_start_time ??
              b.startTime ??
              0
          ).getTime();
          return ta - tb;
        });
      });
    });
    return out;
  }, [shifts]);

  function moveBack() {
    if (viewMode === "week") {
      const nd = new Date(startDate);
      nd.setDate(startDate.getDate() - 7);
      setStartDate(nd);
    } else if (viewMode === "month") {
      const nd = new Date(startDate);
      nd.setMonth(startDate.getMonth() - 1, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    } else {
      const nd = new Date(startDate);
      nd.setFullYear(startDate.getFullYear() - 1, 0, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    }
  }
  function moveNext() {
    if (viewMode === "week") {
      const nd = new Date(startDate);
      nd.setDate(startDate.getDate() + 7);
      setStartDate(nd);
    } else if (viewMode === "month") {
      const nd = new Date(startDate);
      nd.setMonth(startDate.getMonth() + 1, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    } else {
      const nd = new Date(startDate);
      nd.setFullYear(startDate.getFullYear() + 1, 0, 1);
      nd.setHours(0, 0, 0, 0);
      setStartDate(nd);
    }
  }
  function goToday() {
    const nd = new Date();
    nd.setHours(0, 0, 0, 0);
    setStartDate(nd);
  }

  function openCreateForDate(d: Date, guardId?: number | null) {
    setCreateDate(d);
    setCreateGuardId(guardId ?? null);
    setCreateOpen(true);
  }

  function handleCreateDone(_: Shift) {
    setCreateOpen(false);
    setCreateDate(null);
    setCreateGuardId(null);
    fetchShifts();
  }
  function handleEditDone(_: Shift) {
    setOpenEdit(false);
    setActionShift(null);
    fetchShifts();
  }
  function handleDeleteDone(_: number) {
    setOpenDelete(false);
    setActionShift(null);
    fetchShifts();
  }

  const dayColMinWidth = viewMode === "week" ? 110 : 80;
  const maxVisibleGuards = 8;
  const rowHeight = 44;
  const bodyMaxHeight = maxVisibleGuards * rowHeight + 2;

  // Calculate the real minimum width of the table so it doesn't "squeeze"
  const tableMinWidth = React.useMemo(() => {
    const firstCol = 200; // same min width as first column
    return firstCol + days.length * dayColMinWidth;
  }, [days.length, dayColMinWidth]);

  // ref to the horizontal-scrolling wrapper so we can reset scrollLeft when viewMode changes
  const outerWrapperRef = React.useRef<HTMLDivElement | null>(null);

  // When viewMode or days change, reset horizontal scroll so user sees the start of the table
  React.useEffect(() => {
    if (!outerWrapperRef.current) return;
    // snap to start (no animation) — keeps columns consistent when switching to month
    outerWrapperRef.current.scrollLeft = 0;
  }, [viewMode, days.length]);

  const ActionsDialog = ({
    shift,
    open,
    onClose,
  }: {
    shift: Shift | null;
    open: boolean;
    onClose: () => void;
  }) => {
    if (!shift) return null;
    return (
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {(TEXT as any)?.shifts?.actionsTitle ?? "Acciones del turno"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="text-sm">
              <strong>ID:</strong> {shift.id}
            </div>
            <div className="text-sm">
              <strong>
                {(TEXT as any)?.shifts?.labels?.plannedStart ?? "Planned"}:
              </strong>{" "}
              {shift.plannedStartTime ??
                (shift as any).planned_start_time ??
                "-"}
            </div>
            <div className="text-sm">
              <strong>
                {(TEXT as any)?.shifts?.labels?.plannedEnd ?? "Planned End"}:
              </strong>{" "}
              {shift.plannedEndTime ?? (shift as any).planned_end_time ?? "-"}
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" onClick={onClose}>
                {(TEXT as any)?.actions?.close ?? "Close"}
              </Button>
              <Button
                onClick={() => {
                  setOpenEdit(true);
                }}
              >
                {(TEXT as any)?.actions?.edit ?? "Edit"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setOpenDelete(true);
                }}
              >
                {(TEXT as any)?.actions?.delete ?? "Delete"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent size="xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 w-full pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" />
                <div>
                  <DialogTitle className="text-base">
                    {(TEXT as any)?.properties?.shiftsTitle ??
                      `Turnos — ${propertyName ?? `#${propertyId}`}`}
                  </DialogTitle>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {viewMode === "week"
                      ? "Semana"
                      : viewMode === "month"
                      ? "Mes"
                      : "Año"}{" "}
                    •{" "}
                    {viewMode === "week"
                      ? `${days[0].toLocaleDateString()} — ${days[
                          days.length - 1
                        ].toLocaleDateString()}`
                      : viewMode === "month"
                      ? days[0].toLocaleDateString(undefined, {
                          month: "long",
                          year: "numeric",
                        })
                      : `Año ${startDate.getFullYear()}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border rounded px-2 py-1 bg-white">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder={
                      (TEXT as any)?.shifts?.searchPlaceholder ??
                      "Buscar guardias..."
                    }
                    value={guardSearch}
                    onChange={(e) => setGuardSearch(e.target.value)}
                    className="text-sm outline-none w-48 "
                  />
                </div>

                <div className="flex border rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode("week")}
                    className={`px-3 py-1 text-sm ${
                      viewMode === "week" ? "bg-muted/10" : "bg-white"
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("month")}
                    className={`px-3 py-1 text-sm ${
                      viewMode === "month" ? "bg-muted/10" : "bg-white"
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("year")}
                    className={`px-3 py-1 text-sm ${
                      viewMode === "year" ? "bg-muted/10" : "bg-white"
                    }`}
                  >
                    Año
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={moveBack}
                    title="Anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToday}
                    title="Hoy"
                  >
                    Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={moveNext}
                    title="Siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {loading ? (
              <div className="p-4">
                {(TEXT as any)?.common?.loading ?? "Cargando..."}
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-600">{error}</div>
            ) : (
              <div
                className="rounded-lg border bg-white overflow-x-auto"
                ref={outerWrapperRef}
              >
                {/* wrapper interior: obligamos al ancho real de la tabla (suma de columnas) */}
                <div style={{ minWidth: `${tableMinWidth}px` }} className="overflow-hidden">
                  {/* contenedor que hace el scroll vertical del body y es el ancestor para sticky top */}
                  <div
                    style={{
                      maxHeight:
                        guardsFiltered.length > 8 ? `${bodyMaxHeight}px` : undefined,
                      overflowY: "auto", // solo scroll vertical aquí
                      overflowX: "hidden", // evitar doble scroll x
                    }}
                  >
                    <Table
                      className="table-fixed border-collapse text-sm"
                      style={{ minWidth: `${tableMinWidth}px` }} // garantiza que la tabla tenga el ancho necesario
                    >
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead
                            className="sticky left-0 top-0 z-20 bg-gray-50 border px-2 py-2 text-left font-bold"
                            style={{ minWidth: 200 }}
                          >
                            Guardias
                          </TableHead>

                          {days.map((d) => {
                            const label = d.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "numeric",
                              day: "numeric",
                            });
                            return (
                              <TableHead
                                key={d.toISOString()}
                                className="border px-2 py-2 text-center font-bold sticky top-0 bg-gray-50"
                                style={{ minWidth: dayColMinWidth }}
                              >
                                <div className="text-xs">{label}</div>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {guardsFiltered.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={days.length + 1}
                              className="p-4 text-sm text-muted-foreground"
                            >
                              No hay turnos/guardias en el rango seleccionado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          guardsFiltered.map((g) => {
                            return (
                              <TableRow
                                key={g.id}
                                className="hover:bg-muted/5"
                                style={{ height: rowHeight }}
                              >
                                <TableCell
                                  className="sticky left-0 z-10 bg-white border px-2 py-2 font-medium"
                                  style={{ minWidth: 200 }}
                                >
                                  <div className="text-sm truncate">{g.name}</div>
                                </TableCell>

                                {days.map((d) => {
                                  const key = `${d.getFullYear()}-${pad(
                                    d.getMonth() + 1
                                  )}-${pad(d.getDate())}`;
                                  const rec =
                                    shiftsByGuardAndDate.get(g.id)?.[key] ?? [];
                                  if (!rec || rec.length === 0) {
                                    return (
                                      <TableCell
                                        key={key}
                                        className="border px-2 py-2 text-center text-xs text-muted-foreground cursor-pointer hover:bg-muted/5"
                                        style={{ minWidth: dayColMinWidth }}
                                        onClick={() => {
                                          openCreateForDate(d, g.id);
                                        }}
                                      >
                                        <div className="select-none">+</div>
                                      </TableCell>
                                    );
                                  }
                                  return (
                                    <TableCell
                                      key={key}
                                      className="border px-2 py-2 text-center align-top"
                                      style={{ minWidth: dayColMinWidth }}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        {rec.map((s) => {
                                          const startIso =
                                            s.plannedStartTime ??
                                            (s as any).planned_start_time ??
                                            s.startTime ??
                                            (s as any).start_time;
                                          const endIso =
                                            s.plannedEndTime ??
                                            (s as any).planned_end_time ??
                                            s.endTime ??
                                            (s as any).end_time;
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
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-muted-foreground">
                {(TEXT as any)?.properties?.shiftsFooter ??
                  "Usa los controles para navegar semanas/meses/años. Haz click en + para crear un turno o en un turno existente para ver acciones."}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  {(TEXT as any)?.actions?.close ?? "Close"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createOpen && createDate && (
        <CreateShift
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateDate(null);
            setCreateGuardId(null);
          }}
          propertyId={propertyId}
          selectedDate={createDate}
          preselectedProperty={preselectedPropertyObj as any}
          preloadedProperties={preloadedPropertiesArray as any}
          guardId={createGuardId ?? undefined}
          preloadedGuard={
            createGuardId
              ? ({
                  id: createGuardId,
                  firstName: undefined,
                  lastName: undefined,
                } as any)
              : null
          }
          onCreated={(shift) => handleCreateDone(shift)}
        />
      )}

      <ActionsDialog
        shift={actionShift}
        open={!!actionShift && !openEdit && !openDelete}
        onClose={() => setActionShift(null)}
      />

      {actionShift && (
        <EditShift
          open={openEdit}
          onClose={() => setOpenEdit(false)}
          shiftId={actionShift.id}
          initialShift={actionShift}
          onUpdated={(s) => handleEditDone(s)}
        />
      )}

      {actionShift && (
        <DeleteShift
          open={openDelete}
          onClose={() => setOpenDelete(false)}
          shiftId={actionShift.id}
          onDeleted={(id) => handleDeleteDone(id)}
        />
      )}
    </>
  );
}
