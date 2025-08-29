// src/components/Shifts/Show.tsx
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
import { getShift } from "@/lib/services/shifts";
import type { Shift } from "../types";
import EditShift from "../Edit/Edit";
import DeleteShift from "../Delete/Delete";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

type ShowShiftProps = {
  open: boolean;
  onClose: () => void;
  shiftId: number;
  onUpdated?: (shift: Shift) => void;
  onDeleted?: (id: number) => void;
};

export default function ShowShift({ open, onClose, shiftId, onUpdated, onDeleted }: ShowShiftProps) {
  const { TEXT } = useI18n();
  const [shift, setShift] = React.useState<Shift | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    getShift(shiftId)
      .then((s) => setShift(s as Shift))
      .catch((err) => {
        console.error(err);
        toast.error(TEXT.shifts.errors.fetchFailed ?? "Could not load shift");
        onClose();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId]);

  function handleUpdated(updated: Shift) {
    setShift(updated);
    setOpenEdit(false);
    onUpdated?.(updated);
  }

  function handleDeleted(id: number) {
    setOpenDelete(false);
    onDeleted?.(id);
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{TEXT.shifts.show.title ?? "Detalles del Turno"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {loading ? (
              <div>{TEXT.common.loading ?? "Loading..."}</div>
            ) : !shift ? (
              <div>{TEXT.shifts.errors.noShift ?? "No shift"}</div>
            ) : (
              <div className="space-y-3">
                <div><strong>ID:</strong> {shift.id}</div>
                <div><strong>Guard:</strong> {shift.guard}</div>
                <div><strong>Property:</strong> {shift.property}</div>
                <div><strong>Start:</strong> {new Date(shift.startTime).toLocaleString()}</div>
                <div><strong>End:</strong> {new Date(shift.endTime).toLocaleString()}</div>
                <div><strong>Status:</strong> {shift.status}</div>
                <div><strong>Hours worked:</strong> {shift.hoursWorked}</div>
                <div><strong>Active:</strong> {shift.isActive ? "Yes" : "No"}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full mt-2">
              <Button variant="ghost" onClick={onClose}>{TEXT.actions.close ?? "Close"}</Button>
              <Button onClick={() => setOpenEdit(true)} disabled={!shift}>
                {TEXT.actions.edit ?? "Edit"}
              </Button>
              <Button variant="destructive" onClick={() => setOpenDelete(true)} disabled={!shift}>
                {TEXT.actions.delete ?? "Delete"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditShift
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        shiftId={shiftId}
        initialShift={shift ?? undefined}
        onUpdated={handleUpdated}
      />

      <DeleteShift
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        shiftId={shiftId}
        onDeleted={handleDeleted}
      />
    </>
  );
}
