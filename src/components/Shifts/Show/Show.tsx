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
import { getGuard } from "@/lib/services/guard";
import { getProperty } from "@/lib/services/properties";
import type { Shift } from "../types";
import EditShift from "../Edit/Edit";
import DeleteShift from "../Delete/Delete";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";

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

  // estados para nombres
  const [guardObj, setGuardObj] = React.useState<Guard | null>(null);
  const [propertyObj, setPropertyObj] = React.useState<AppProperty | null>(null);
  const [loadingNames, setLoadingNames] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setShift(null);
    setGuardObj(null);
    setPropertyObj(null);
    getShift(shiftId)
      .then((s) => setShift(s as Shift))
      .catch((err) => {
        console.error(err);
        toast.error((TEXT as any)?.shifts?.errors?.fetchFailed ?? "Could not load shift");
        onClose();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId]);

  // cuando cargue shift, obtener guard y property (preferir details si vienen)
  React.useEffect(() => {
    if (!shift) return;
    let mounted = true;
    setLoadingNames(true);

    (async () => {
      try {
        // GUARD: preferir guardDetails
        try {
          if ((shift as any).guardDetails) {
            const gd: any = (shift as any).guardDetails;
            const gObj: Guard = {
              id: Number(gd.id ?? (shift as any).guard),
              user: (gd.user as any) ?? undefined,
              firstName: gd.first_name ?? gd.firstName ?? gd.name ?? "",
              lastName: gd.last_name ?? gd.lastName ?? "",
              email: gd.email ?? "",
            } as Guard;
            if (mounted) setGuardObj(gObj);
          } else if (shift.guard != null) {
            // fallback: obtener por API
            try {
              const g = await getGuard(Number(shift.guard));
              if (mounted) setGuardObj(g ?? null);
            } catch (e) {
              console.error("getGuard failed", e);
              if (mounted) setGuardObj(null);
            }
          } else {
            if (mounted) setGuardObj(null);
          }
        } catch (e) {
          console.error("guard mapping failed", e);
          if (mounted) setGuardObj(null);
        }

        // PROPERTY: preferir propertyDetails
        try {
          if ((shift as any).propertyDetails) {
            const pd: any = (shift as any).propertyDetails;
            const pObj = {
              id: Number(pd.id ?? (shift as any).property),
              // ownerId es el campo requerido por AppProperty — intentar varias fuentes posibles
              ownerId:
                pd.owner !== undefined
                  ? Number(pd.owner)
                  : pd.owner_id !== undefined
                  ? Number(pd.owner_id)
                  : pd.owner_details?.id !== undefined
                  ? Number(pd.owner_details.id)
                  : undefined,
              name: pd.name ?? pd.title ?? "",
              alias: pd.alias ?? undefined,
              address: pd.address ?? undefined,
              description: pd.description ?? undefined,
            } as unknown as AppProperty;

            if (mounted) setPropertyObj(pObj);
          } else if (shift.property != null) {
            // fallback: obtener por API
            try {
              const p = await getProperty(Number(shift.property));
              if (mounted) setPropertyObj(p ?? null);
            } catch (e) {
              console.error("getProperty failed", e);
              if (mounted) setPropertyObj(null);
            }
          } else {
            if (mounted) setPropertyObj(null);
          }
        } catch (e) {
          console.error("property mapping failed", e);
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
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{(TEXT as any)?.shifts?.show?.title ?? "Detalles del Turno"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {loading ? (
              <div>{(TEXT as any)?.common?.loading ?? "Loading..."}</div>
            ) : !shift ? (
              <div>{(TEXT as any)?.shifts?.errors?.noShift ?? "No shift"}</div>
            ) : (
              <div className="space-y-3">
                <div><strong>ID:</strong> {shift.id}</div>
                <div><strong>Guard:</strong> {renderGuardLabel()}</div>
                <div><strong>Property:</strong> {renderPropertyLabel()}</div>
                <div><strong>Start:</strong> {shift.startTime ? new Date(shift.startTime).toLocaleString() : "-"}</div>
                <div><strong>End:</strong> {shift.endTime ? new Date(shift.endTime).toLocaleString() : "-"}</div>
                <div><strong>Status:</strong> {shift.status}</div>
                <div><strong>Hours worked:</strong> {shift.hoursWorked}</div>
                <div><strong>Active:</strong> {shift.isActive ? "Yes" : "No"}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full mt-2">
              <Button variant="ghost" onClick={onClose}>{(TEXT as any)?.actions?.close ?? "Close"}</Button>
              <Button onClick={() => setOpenEdit(true)} disabled={!shift}>
                {(TEXT as any)?.actions?.edit ?? "Edit"}
              </Button>
              <Button variant="destructive" onClick={() => setOpenDelete(true)} disabled={!shift}>
                {(TEXT as any)?.actions?.delete ?? "Delete"}
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
