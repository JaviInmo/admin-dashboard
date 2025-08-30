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
import { Calendar } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

import CreateShift from "@/components/Shifts/Create/Create";
import ShowShift from "@/components/Shifts/Show/Show";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";
import type { Shift } from "@/components/Shifts/types";
import { listShiftsByGuard } from "@/lib/services/shifts";

/**
 * Normaliza la respuesta del backend a la forma `Shift` que espera la UI.
 * (misma implementación que tenías antes)
 */
function normalizeShiftsArray(input: any): Shift[] {
  if (!input) return [];
  const arr = Array.isArray(input)
    ? input
    : Array.isArray(input?.results)
    ? input.results
    : Array.isArray(input?.items)
    ? input.items
    : null;
  if (!arr) return [];
  return arr.map((s: any) => {
    const guardId =
      s.guard ??
      s.guard_id ??
      (s.guard_details ? s.guard_details.id ?? s.guard_details.pk ?? undefined : undefined) ??
      (s.guard && typeof s.guard === "object" ? s.guard.id : undefined);

    const propertyId =
      s.property ??
      s.property_id ??
      (s.property_details ? s.property_details.id ?? s.property_details.pk ?? undefined : undefined) ??
      (s.property && typeof s.property === "object" ? s.property.id : undefined);

    return {
      id: s.id ?? s.pk ?? 0,
      guard: guardId,
      property: propertyId,
      startTime: s.start_time ?? s.startTime ?? s.start ?? null,
      endTime: s.end_time ?? s.endTime ?? s.end ?? null,
      status: s.status ?? "scheduled",
      hoursWorked: s.hours_worked ?? s.hoursWorked ?? s.hours ?? 0,
      isActive: s.is_active ?? s.isActive ?? true,
      __raw: s,
    } as Shift;
  });
}

type Props = {
  guardId: number;
  guardName?: string;
  open: boolean;
  onClose: () => void;
};

export default function GuardsShiftsModal({ guardId, guardName, open, onClose }: Props) {
  const { TEXT } = useI18n();

  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [hasNext, setHasNext] = React.useState<boolean>(false);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openShowId, setOpenShowId] = React.useState<number | null>(null);
  const [openEditId, setOpenEditId] = React.useState<number | null>(null);
  const [openDeleteId, setOpenDeleteId] = React.useState<number | null>(null);

  // Al abrir: fetch
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function fetchFirst() {
      setLoading(true);
      try {
        const res = await listShiftsByGuard(guardId, 1, 10, "-start_time");
        const normalized = normalizeShiftsArray(res);
        if (!mounted) return;
        setShifts(normalized);
        setPage(1);
        setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));
      } catch (err) {
        console.error("[ShiftsModal] error fetching:", err);
        toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFirst();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guardId]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await listShiftsByGuard(guardId, nextPage, 10, "-start_time");
      const newItems = normalizeShiftsArray(res);
      setShifts((p) => [...p, ...newItems]);
      setPage(nextPage);
      setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));
    } catch (err) {
      console.error("[LoadMore] error:", err);
      toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts");
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(s: Shift) {
    setShifts((p) => [s, ...p]);
    setOpenCreate(false);
    toast.success(TEXT?.shifts?.messages?.created ?? "Shift created");
  }
  function handleUpdated(s: Shift) {
    setShifts((p) => p.map((x) => (x.id === s.id ? s : x)));
    setOpenShowId(null);
    setOpenEditId(null);
    setOpenDeleteId(null);
    toast.success(TEXT?.shifts?.messages?.updated ?? "Shift updated");
  }
  function handleDeleted(id: number) {
    setShifts((p) => p.filter((x) => x.id !== id));
    setOpenShowId(null);
    setOpenEditId(null);
    setOpenDeleteId(null);
    toast.success(TEXT?.shifts?.messages?.deleted ?? "Shift deleted");
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between w-full pt-3.5">
            <div>
              <DialogTitle className="text-lg">{guardName ? `${TEXT?.shifts?.show?.title ?? "Turnos"} — ${guardName}` : (TEXT?.shifts?.show?.title ?? "Turnos")}</DialogTitle>
              <div className="text-xs text-muted-foreground">{TEXT?.shifts?.show?.subtitle ?? "Lista de turnos (scrollable)"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setOpenCreate(true)}>{TEXT?.shifts?.create?.title ?? TEXT?.actions?.create ?? "Asignar"}</Button>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto p-2 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">{TEXT?.common?.loading ?? "Loading..."}</div>
          ) : shifts.length === 0 ? (
            <div className="rounded border border-dashed border-muted/50 p-4 text-sm text-muted-foreground">{TEXT?.table?.noData ?? "No hay turnos"}</div>
          ) : (
            shifts.map((s) => {
              const raw = (s as any).__raw;
              const propertyLabel = raw?.property_details?.name ?? raw?.property_details?.alias ?? s.property;
              return (
                <div key={s.id} className="flex items-center justify-between gap-4 rounded-md border p-3 shadow-sm bg-card">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-muted-foreground"><Calendar className="h-5 w-5" /></div>
                    <div>
                      <div className="text-sm font-medium">
                        {s.startTime ? new Date(s.startTime).toLocaleString() : "—"} — {s.endTime ? new Date(s.endTime).toLocaleString() : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.status} · {s.hoursWorked}h · {propertyLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenShowId(s.id)}
                      title={TEXT?.actions?.view ?? "Ver"}
                    >
                      {TEXT?.actions?.view ?? "Ver"}
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => setOpenEditId(s.id)}>{TEXT?.actions?.edit ?? "Editar"}</Button>

                    <Button size="sm" variant="destructive" onClick={() => setOpenDeleteId(s.id)}>{TEXT?.actions?.delete ?? "Eliminar"}</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {hasNext && (
          <div className="mt-3 flex justify-center">
            <Button size="sm" variant="outline" onClick={loadMore} disabled={loading}>{loading ? (TEXT?.common?.loading ?? "Loading...") : (TEXT?.actions?.refresh ?? "Cargar más")}</Button>
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose}>{TEXT?.actions?.close ?? "Close"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <CreateShift open={openCreate} onClose={() => setOpenCreate(false)} guardId={guardId} onCreated={handleCreated} />

      {openShowId !== null && (
        <ShowShift open={openShowId !== null} onClose={() => setOpenShowId(null)} shiftId={openShowId as number} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      )}

      {openEditId !== null && (
        <EditShift open={openEditId !== null} onClose={() => setOpenEditId(null)} shiftId={openEditId as number} onUpdated={handleUpdated} />
      )}

      {openDeleteId !== null && (
        <DeleteShift open={openDeleteId !== null} onClose={() => setOpenDeleteId(null)} shiftId={openDeleteId as number} onDeleted={handleDeleted} />
      )}
    </Dialog>
  );
}
