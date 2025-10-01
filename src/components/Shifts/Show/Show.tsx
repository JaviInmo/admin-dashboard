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
import { useShiftsCache } from "@/hooks/use-shifts-cache";
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

function safeDateString(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function ShowShift({ open, onClose, shiftId, onUpdated, onDeleted }: ShowShiftProps) {
  const { TEXT } = useI18n();
  const [shift, setShift] = React.useState<Shift | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  const [guardObj, setGuardObj] = React.useState<Guard | null>(null);
  const [propertyObj, setPropertyObj] = React.useState<AppProperty | null>(null);
  const [loadingNames, setLoadingNames] = React.useState(false);

  // Cache de turnos
  const { fetchWithCache: fetchShiftWithCache, getFromCache: getShiftFromCache } = useShiftsCache();

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setShift(null);
    setGuardObj(null);
    setPropertyObj(null);

    let mounted = true;
    (async () => {
      try {
        // Primero cargar desde cache inmediatamente si existe
        const cachedShift = getShiftFromCache(shiftId);
        if (cachedShift && mounted) {
          setShift(cachedShift as Shift);
          console.log(`⚡ Turno ${shiftId} cargado desde cache`);
        }
        
        // Luego hacer petición al backend para datos frescos
        await fetchShiftWithCache(
          shiftId,
          () => getShift(shiftId),
          (data, fromCache) => {
            if (mounted && !fromCache && data) {
              setShift(data as Shift);
              console.log(`✅ Turno ${shiftId} actualizado desde backend`);
            }
          }
        );
      } catch (err) {
        console.error(err);
        toast.error((TEXT as any)?.shifts?.errors?.fetchFailed ?? "Could not load shift");
        onClose();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId]);

  React.useEffect(() => {
    if (!shift) return;
    let mounted = true;
    setLoadingNames(true);

    (async () => {
      try {
        // GUARD
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

        // PROPERTY
        try {
          if ((shift as any).propertyDetails) {
            const pd: any = (shift as any).propertyDetails;
            const pObj = {
              id: Number(pd.id ?? (shift as any).property),
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
    if (loadingNames) return (TEXT as any)?.common?.loading ?? "Cargando...";
    if (guardObj) return `${guardObj.firstName} ${guardObj.lastName}${guardObj.email ? ` (${guardObj.email})` : ""}`;
    if (shift?.guard != null) return String(shift.guard);
    return "-";
  };

  const renderPropertyLabel = () => {
    if (loadingNames) return (TEXT as any)?.common?.loading ?? "Cargando...";
    if (propertyObj) return `${propertyObj.name ?? propertyObj.alias ?? propertyObj.address} #${propertyObj.id}`;
    if (shift?.property != null) return String(shift.property);
    return "-";
  };

  const renderServiceLabel = () => {
    if (!shift) return "-";
    if ((shift as any).serviceDetails) {
      const sd: any = (shift as any).serviceDetails;
      return sd.name ?? sd.property_name ?? `#${sd.id}`;
    }
    if (shift.service != null) return `#${shift.service}`;
    return "-";
  };

  const renderWeaponInfo = () => {
    if (!shift || !shift.isArmed) return null;

    // Intentar parsear weaponDetails como JSON si es un string
    let weapons: any[] = [];
    if (typeof shift.weaponDetails === 'string') {
      try {
        const parsed = JSON.parse(shift.weaponDetails);
        if (Array.isArray(parsed)) {
          weapons = parsed;
        } else if (parsed.results && Array.isArray(parsed.results)) {
          weapons = parsed.results;
        }
      } catch (e) {
        // Si no se puede parsear, mostrar como texto plano
        return (
          <div>
            <strong>Weapon details:</strong> {shift.weaponDetails}
          </div>
        );
      }
    } else if (Array.isArray(shift.weaponDetails)) {
      weapons = shift.weaponDetails;
    }

    if (weapons.length > 0) {
      return (
        <div>
          <strong>Weapons:</strong>
          <div className="ml-4 mt-1 space-y-1">
            {weapons.map((weapon, index) => {
              // Extraer información del arma de manera robusta
              let model = '-';
              let serial = '-';

              if (typeof weapon === 'object' && weapon !== null) {
                // Intentar diferentes campos posibles para model y serial
                model = weapon.model || weapon.weapon_model || weapon.modelo || '-';
                serial = weapon.serial_number || weapon.serialNumber || weapon.serial || weapon.serie || '-';

                // Si serial es un objeto, intentar extraer información de él
                if (typeof serial === 'object' && serial !== null) {
                  const serialObj = serial as any;
                  serial = serialObj.serial_number || serialObj.serialNumber || serialObj.serial || JSON.stringify(serial);
                }
              }

              return (
                <div key={weapon.id || index} className="text-sm">
                  <div><strong>Model:</strong> {model}</div>
                  <div><strong>Serial:</strong> {serial}</div>
                  {index < weapons.length - 1 && <hr className="my-2 border-gray-200" />}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Fallback: mostrar serial individual si existe
    const serial = (shift as any).weaponSerialNumber ?? shift.weaponDetails ?? null;
    if (serial) {
      return (
        <div>
          <strong>Weapon serial:</strong> {String(serial)}
        </div>
      );
    }

    return (
      <div>
        <strong>Weapon:</strong> Armed but no weapon details available
      </div>
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
                <div><strong>ID:</strong> {String(shift.id)}</div>
                <div><strong>Guard:</strong> {renderGuardLabel()}</div>
                <div><strong>Property:</strong> {renderPropertyLabel()}</div>
                <div><strong>Service:</strong> {renderServiceLabel()}</div>

                <div><strong>Planned Start:</strong> {safeDateString((shift as any).plannedStartTime ?? (shift as any).planned_start_time ?? null)}</div>
                <div><strong>Planned End:</strong> {safeDateString((shift as any).plannedEndTime ?? (shift as any).planned_end_time ?? null)}</div>

                <div><strong>Start:</strong> {safeDateString(shift.startTime ?? (shift as any).start_time ?? null)}</div>
                <div><strong>End:</strong> {safeDateString(shift.endTime ?? (shift as any).end_time ?? null)}</div>

                <div><strong>Status:</strong> {shift.status ?? "-"}</div>
                <div><strong>Hours worked:</strong> {shift.hoursWorked ?? "-"}</div>

                <div><strong>Is armed:</strong> {shift.isArmed ? "Yes" : "No"}</div>
                {renderWeaponInfo()}

                <div><strong>Active:</strong> {shift.isActive ? "Yes" : "No"}</div>

                <div><strong>Created at:</strong> {safeDateString((shift as any).createdAt ?? (shift as any).created_at ?? null)}</div>
                <div><strong>Updated at:</strong> {safeDateString((shift as any).updatedAt ?? (shift as any).updated_at ?? null)}</div>
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
