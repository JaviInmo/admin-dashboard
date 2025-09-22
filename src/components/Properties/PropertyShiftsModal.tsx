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

import PropertyShiftsTable from "@/components/Properties/PropertyShiftsTable";

type Props = {
  propertyId: number;
  propertyName?: string;
  open: boolean;
  onClose: () => void;
};

type SimpleGuard = {
  id: number;
  name: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoToLocalDateKey(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const [createPreloadedGuard, setCreatePreloadedGuard] = React.useState<
    SimpleGuard | null
  >(null);

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
    // iteramos shifts en orden; si un shift tiene guardDetails/name lo usamos
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

  // openCreateForDateLocal
  function openCreateForDateLocal(d: Date, guard?: SimpleGuard | null) {
    setCreateDate(d);
    setCreateGuardId(guard ? guard.id : null);
    setCreatePreloadedGuard(guard ?? null);
    setCreateOpen(true);
  }

  // handleCreateDone actualizado:
  async function handleCreateDone(created?: Shift) {
    // cerrar modal y limpiar
    setCreateOpen(false);
    setCreateDate(null);
    setCreateGuardId(null);
    setCreatePreloadedGuard(null);

    if (created) {
      // refrescar desde backend para asegurar que shifts y guard info estén completos
      await fetchShifts();

      // localizar fila del guard y hacer scrollIntoView
      const gid = Number(created.guard ?? (created as any).guardDetails?.id ?? -1);
      if (gid !== -1 && outerWrapperRef.current) {
        // damos un pequeño delay para que DOM se haya actualizado
        setTimeout(() => {
          try {
            const root = outerWrapperRef.current!;
            const el = root.querySelector(`[data-guard-row="guard-${gid}"]`) as HTMLElement | null;
            if (el) {
              // hacemos scroll en el scrollable ancestor (el contenedor padre del body)
              el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } else {
              // fallback: scroll top
              const scrollable = root.querySelector('[style*="overflow-y: auto"]') as HTMLElement | null;
              if (scrollable) scrollable.scrollTop = 0;
            }
          } catch (err) {
            // swallow
            console.warn("scrollIntoView guard row failed:", err);
          }
        }, 60);
      }
      return;
    }

    // si no hay created, solo refrescamos
    await fetchShifts();
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

  const tableMinWidth = React.useMemo(() => {
    const firstCol = 200;
    return firstCol + days.length * dayColMinWidth;
  }, [days.length, dayColMinWidth]);

  const outerWrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!outerWrapperRef.current) return;
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

          <div className="mt-4 flex justify-end gap-2 w-full">
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
  <Button
    type="button"
    onClick={() => setViewMode("week")}
    className={`px-3 py-1 text-sm transition-colors ${
      viewMode === "week"
        ? "bg-black text-white"
        : "bg-white text-black hover:bg-gray-100"
    }`}
  >
    Semana
  </Button>
  <Button
    type="button"
    onClick={() => setViewMode("month")}
    className={`px-3 py-1 text-sm transition-colors ${
      viewMode === "month"
        ? "bg-black text-white"
        : "bg-white text-black hover:bg-gray-100"
    }`}
  >
    Mes
  </Button>
  <Button
    type="button"
    onClick={() => setViewMode("year")}
    className={`px-3 py-1 text-sm transition-colors ${
      viewMode === "year"
        ? "bg-black text-white"
        : "bg-white text-black hover:bg-gray-100"
    }`}
  >
    Año
  </Button>
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

          {/* Tabla */}
          <div className="max-w-7xl overflow-x-hidden">
            <PropertyShiftsTable
              days={days}
              guardsFiltered={guardsFiltered}
              shiftsByGuardAndDate={shiftsByGuardAndDate}
              openCreateForDate={openCreateForDateLocal}
              setActionShift={setActionShift}
              loading={loading}
              error={error}
              dayColMinWidth={dayColMinWidth}
              tableMinWidth={tableMinWidth}
              bodyMaxHeight={guardsFiltered.length > 8 ? `${bodyMaxHeight}px` : undefined}
              rowHeight={rowHeight}
              outerWrapperRef={outerWrapperRef}
            />
          </div>

         

          <DialogFooter>
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-muted-foreground pt-3">
                {(TEXT as any)?.properties?.shiftsFooter ??
                  "Usa los controles para navegar semanas/meses/años. Haz click en + para crear un turno o en un turno existente para ver acciones."}
              </div>
              <div className="flex gap-2">
                 {/* Botón externo */}
         
            <Button
              onClick={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                setCreateDate(today);
                setCreateGuardId(null);
                setCreatePreloadedGuard(null);
                setCreateOpen(true);
              }}
            
            >
              Crear turno
            </Button>
       
                <Button variant="outline" onClick={onClose}>
                  {(TEXT as any)?.actions?.close ?? "Close"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CreateShift modal: PASAMOS preloadedGuards (caché) y preloadedGuard (objeto si existe) */}
      {createOpen && createDate && (
        <CreateShift
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateDate(null);
            setCreateGuardId(null);
            setCreatePreloadedGuard(null);
          }}
          propertyId={propertyId}
          selectedDate={createDate}
          preselectedProperty={preselectedPropertyObj as any}
          preloadedProperties={preloadedPropertiesArray as any}
          guardId={createGuardId ?? undefined}
          preloadedGuards={guardsAll as any}
          preloadedGuard={createPreloadedGuard as any}
          onCreated={(shift) => {
            // CreateShift devuelve el shift creado
            handleCreateDone(shift);
          }}
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
