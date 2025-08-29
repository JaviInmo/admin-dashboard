// src/components/Shifts/Delete.tsx
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
import { deleteShift, softDeleteShift, getShift } from "@/lib/services/shifts";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";

type DeleteShiftProps = {
  open: boolean;
  onClose: () => void;
  shiftId: number;
  onDeleted?: (id: number) => void;
};

export default function DeleteShift({ open, onClose, shiftId, onDeleted }: DeleteShiftProps) {
  const { TEXT } = useI18n();
  const [hardDelete, setHardDelete] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [shift, setShift] = React.useState<Shift | null>(null);
  const [loadingShift, setLoadingShift] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setHardDelete(false);
    setShift(null);
    setLoadingShift(true);
    getShift(shiftId)
      .then((s) => setShift(s as Shift))
      .catch((err) => {
        console.error(err);
        toast.error(TEXT.shifts.errors.fetchFailed ?? "Could not load shift");
        onClose();
      })
      .finally(() => setLoadingShift(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId]);

  async function confirmDelete() {
    setLoading(true);
    try {
      if (hardDelete) {
        await deleteShift(shiftId);
        toast.success(TEXT.shifts.messages.deleted ?? "Shift deleted");
      } else {
        await softDeleteShift(shiftId);
        toast.success(TEXT.shifts.messages.softDeleted ?? "Shift soft-deleted");
      }
      onDeleted?.(shiftId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(TEXT.shifts.errors.deleteFailed ?? "Could not delete shift");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{TEXT.shifts.delete.title ?? "Eliminar Turno"}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {loadingShift ? (
            <div>{TEXT.common.loading ?? "Loading..."}</div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-3">
                {TEXT.shifts.delete.confirm ?? "Are you sure you want to delete this shift?"}
              </div>

              {shift ? (
                <div className="space-y-2 mb-4">
                  <div><strong>ID:</strong> {shift.id}</div>
                  <div><strong>Guard:</strong> {shift.guard}</div>
                  <div><strong>Property:</strong> {shift.property}</div>
                  <div><strong>Start:</strong> {new Date(shift.startTime).toLocaleString()}</div>
                  <div><strong>End:</strong> {new Date(shift.endTime).toLocaleString()}</div>
                </div>
              ) : null}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hardDelete}
                  onChange={() => setHardDelete((v) => !v)}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  {TEXT.shifts.delete.hardDeleteLabel ?? "Hard delete (permanently remove)"}
                </span>
              </label>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full mt-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {TEXT.actions.cancel ?? "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading || loadingShift}>
              {loading ? TEXT.actions.deleting ?? "Deleting..." : TEXT.actions.delete ?? "Delete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
