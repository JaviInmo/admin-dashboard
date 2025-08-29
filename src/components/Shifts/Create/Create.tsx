// src/components/Shifts/Create.tsx
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
import { createShift } from "@/lib/services/shifts";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";

type CreateShiftProps = {
  open: boolean;
  onClose: () => void;
  guardId?: number; // si se abre desde modal de guard, pasar el id para prefill
  onCreated?: (shift: Shift) => void;
};

function toIsoFromDatetimeLocal(value: string) {
  // datetime-local -> ISO UTC (Z)
  // new Date("YYYY-MM-DDTHH:mm") is parsed as local time, toISOString ajusta a UTC
  const d = new Date(value);
  return d.toISOString();
}

export default function CreateShift({ open, onClose, guardId, onCreated }: CreateShiftProps) {
  const { TEXT } = useI18n();
  const [property, setProperty] = React.useState<string>("");
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");
  const [status, setStatus] = React.useState<Shift["status"]>("scheduled");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setProperty("");
      setStart("");
      setEnd("");
      setStatus("scheduled");
    }
  }, [open]);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!start || !end) {
      toast.error(TEXT?.shifts?.errors?.missingDates ?? "Start and end are required");
      return;
    }
    const startIso = toIsoFromDatetimeLocal(start);
    const endIso = toIsoFromDatetimeLocal(end);

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error(TEXT?.shifts?.errors?.endBeforeStart ?? "End must be after start");
      return;
    }

    if (!property) {
      toast.error(TEXT?.shifts?.errors?.missingProperty ?? "Property ID required");
      return;
    }

    if (!guardId) {
      // we allow guard not present but prefer guardId passed in
      toast.error(TEXT?.shifts?.errors?.missingGuard ?? "Guard ID required");
      return;
    }

    setLoading(true);
    try {
      const created = await createShift({
        guard: guardId,
        property: Number(property),
        start_time: startIso,
        end_time: endIso,
        status,
      });
      toast.success(TEXT?.shifts?.messages?.created ?? "Shift created");
      onCreated?.(created as Shift);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(TEXT?.shifts?.errors?.createFailed ?? "Could not create shift");
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
          <div className="flex items-center justify-between w-full">
            <DialogTitle>{TEXT?.shifts?.create?.title ?? "Crear Turno"}</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Guard ID</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={guardId ?? ""}
              readOnly
              aria-readonly
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Property ID</label>
            <input
              type="number"
              className="w-full rounded border px-3 py-2"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              placeholder={TEXT?.shifts?.create?.propertyPlaceholder ?? "Property ID (number)"}
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
              <Button variant="ghost" onClick={onClose} type="button">{TEXT?.actions?.close ?? "Close"}</Button>
              <Button type="submit" disabled={loading}>
                {loading ? TEXT?.actions?.saving ?? "Saving..." : TEXT?.actions?.create ?? "Create"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
