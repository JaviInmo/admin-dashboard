// src/components/Shifts/Edit.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getShift, updateShift } from "@/lib/services/shifts";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";

type EditShiftProps = {
  open: boolean;
  onClose: () => void;
  shiftId?: number;
  initialShift?: Shift;
  onUpdated?: (shift: Shift) => void;
};

function toIsoFromDatetimeLocal(value: string) {
  const d = new Date(value);
  return d.toISOString();
}

function isoToLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export default function EditShift({ open, onClose, shiftId, initialShift, onUpdated }: EditShiftProps) {
  const { TEXT } = useI18n();
  const [shift, setShift] = React.useState<Shift | null>(initialShift ?? null);
  const [property, setProperty] = React.useState<string>("");
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");
  const [status, setStatus] = React.useState<Shift["status"]>("scheduled");
  const [loading, setLoading] = React.useState(false);
  const [loadingShift, setLoadingShift] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (initialShift) {
      setShift(initialShift);
      setProperty(String(initialShift.property));
      setStart(isoToLocalInputValue(initialShift.startTime));
      setEnd(isoToLocalInputValue(initialShift.endTime));
      setStatus(initialShift.status);
      return;
    }
    if (shiftId) {
      setLoadingShift(true);
      getShift(shiftId)
        .then((s) => {
          setShift(s as Shift);
          setProperty(String((s as Shift).property));
          setStart(isoToLocalInputValue((s as any).startTime));
          setEnd(isoToLocalInputValue((s as any).endTime));
          setStatus((s as any).status);
        })
        .catch((err) => {
          console.error(err);
          toast.error(TEXT.shifts.errors.fetchFailed ?? "Could not load shift");
          onClose();
        })
        .finally(() => setLoadingShift(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId, initialShift]);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!shift) {
      toast.error(TEXT.shifts.errors.noShift ?? "No shift to edit");
      return;
    }
    if (!start || !end) {
      toast.error(TEXT.shifts.errors.missingDates ?? "Start and end are required");
      return;
    }
    const startIso = toIsoFromDatetimeLocal(start);
    const endIso = toIsoFromDatetimeLocal(end);

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error(TEXT.shifts.errors.endBeforeStart ?? "End must be after start");
      return;
    }

    setLoading(true);
    try {
      const updated = await updateShift(shift.id, {
        property: Number(property),
        start_time: startIso,
        end_time: endIso,
        status,
      });
      toast.success(TEXT.shifts.messages.updated ?? "Shift updated");
      onUpdated?.(updated as Shift);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(TEXT.shifts.errors.updateFailed ?? "Could not update shift");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{TEXT.shifts.edit.title ?? "Editar Turno"}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {loadingShift ? (
            <div>{TEXT.common.loading ?? "Loading..."}</div>
          ) : !shift ? (
            <div>{TEXT.shifts.errors.noShift ?? "No shift loaded"}</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Shift ID</label>
                <input className="w-full rounded border px-3 py-2" value={shift.id} readOnly />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Guard ID</label>
                <input className="w-full rounded border px-3 py-2" value={shift.guard} readOnly />
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Property ID</label>
                <input
                  type="number"
                  className="w-full rounded border px-3 py-2"
                  value={property}
                  onChange={(e) => setProperty(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Start</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border px-3 py-2"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">End</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border px-3 py-2"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Shift["status"])}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="scheduled">scheduled</option>
                  <option value="completed">completed</option>
                  <option value="voided">voided</option>
                </select>
              </div>

              <DialogFooter>
                <div className="flex justify-end gap-2 w-full">
                  <Button variant="ghost" onClick={onClose} type="button">{TEXT.actions.cancel ?? "Close"}</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? TEXT.actions.saving ?? "Saving..." : TEXT.actions.save ?? "Save"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
