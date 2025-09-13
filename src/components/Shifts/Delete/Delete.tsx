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
import { getGuard } from "@/lib/services/guard";
import { getProperty } from "@/lib/services/properties";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";

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

  // Estados para mostrar nombres en lugar de ids
  const [guardObj, setGuardObj] = React.useState<Guard | null>(null);
  const [propertyObj, setPropertyObj] = React.useState<AppProperty | null>(null);
  const [loadingNames, setLoadingNames] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setHardDelete(false);
    setShift(null);
    setGuardObj(null);
    setPropertyObj(null);
    setLoadingShift(true);
    getShift(shiftId)
      .then((s) => setShift(s as Shift))
      .catch((err) => {
        console.error(err);
        toast.error((TEXT as any)?.shifts?.errors?.fetchFailed ?? "Could not load shift");
        onClose();
      })
      .finally(() => setLoadingShift(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId]);

  // cuando shift cambia, intentar obtener guard y property para mostrar names
  React.useEffect(() => {
    if (!shift) return;
    let mounted = true;
    setLoadingNames(true);
    (async () => {
      try {
        // Guard
        try {
          if (shift.guard != null) {
            const g = await getGuard(Number(shift.guard));
            if (mounted) setGuardObj(g ?? null);
          }
        } catch (e) {
          console.error("getGuard failed", e);
          if (mounted) setGuardObj(null);
        }

        // Property
        try {
          if (shift.property != null) {
            const p = await getProperty(Number(shift.property));
            if (mounted) setPropertyObj(p ?? null);
          }
        } catch (e) {
          console.error("getProperty failed", e);
          if (mounted) setPropertyObj(null);
        }
      } finally {
        if (mounted) setLoadingNames(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [shift]);

  async function confirmDelete() {
    setLoading(true);
    try {
      if (hardDelete) {
        await deleteShift(shiftId);
        toast.success((TEXT as any)?.shifts?.messages?.deleted ?? "Shift deleted");
      } else {
        await softDeleteShift(shiftId);
        toast.success((TEXT as any)?.shifts?.messages?.softDeleted ?? "Shift soft-deleted");
      }
      onDeleted?.(shiftId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error((TEXT as any)?.shifts?.errors?.deleteFailed ?? "Could not delete shift");
    } finally {
      setLoading(false);
    }
  }

  const renderGuardLabel = () => {
    if (loadingNames) return "Cargando...";
    if (guardObj) return `${guardObj.firstName} ${guardObj.lastName}${guardObj.email ? ` (${guardObj.email})` : ""}`;
    if (shift?.guard != null) return String(shift.guard);
    return "-";
  };

  const renderPropertyLabel = () => {
    if (loadingNames) return "Cargando...";
    if (propertyObj) return `${propertyObj.name ?? propertyObj.alias ?? propertyObj.address} #${propertyObj.id}`;
    if (shift?.property != null) return String(shift.property);
    return "-";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{(TEXT as any)?.shifts?.delete?.title ?? "Eliminar Turno"}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {loadingShift ? (
            <div>{(TEXT as any)?.common?.loading ?? "Loading..."}</div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-3">
                {(TEXT as any)?.shifts?.delete?.confirm ?? "Are you sure you want to delete this shift?"}
              </div>

              {shift ? (
                <div className="space-y-2 mb-4">
                  <div>
                    <strong>ID:</strong> {shift.id}
                  </div>
                  <div>
                    <strong>Guard:</strong> {renderGuardLabel()}
                  </div>
                  <div>
                    <strong>Property:</strong> {renderPropertyLabel()}
                  </div>
                  <div>
                    <strong>Start:</strong> {shift.startTime ? new Date(shift.startTime).toLocaleString() : "-"}
                  </div>
                  <div>
                    <strong>End:</strong> {shift.endTime ? new Date(shift.endTime).toLocaleString() : "-"}
                  </div>
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
                  {(TEXT as any)?.shifts?.delete?.hardDeleteLabel ?? "Hard delete (permanently remove)"}
                </span>
              </label>
            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full mt-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {(TEXT as any)?.actions?.cancel ?? "Cancel"}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading || loadingShift}>
              {loading ? (TEXT as any)?.actions?.deleting ?? "Deleting..." : (TEXT as any)?.actions?.delete ?? "Delete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
