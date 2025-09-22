// src/components/Properties/properties shifts content/PropertyShiftsModal.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

import CreateShift from "@/components/Shifts/Create/Create";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";

import PropertyShiftsTable from "@/components/Properties/properties shifts content/PropertyShiftsTable";
import PropertyShiftsHeader from "@/components/Properties/properties shifts content/PropertyShiftsHeader";
import ShiftActionsDialog from "@/components/Properties/properties shifts content/ShiftActionsDialog";

import { useShifts } from "@/components/Properties/properties shifts content/hooks/useShifts";
import { useShiftsDerived } from "@/components/Properties/properties shifts content/hooks/useShiftsDerived";

import type { Shift } from "@/components/Shifts/types";
import type { AppProperty } from "@/lib/services/properties";
import type { Guard } from "@/components/Guards/types";

type Props = {
  propertyId: number;
  propertyName?: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Fragmento de tipos para el objeto TEXT (solo las claves que usa este componente).
 */
type UiTextFragment = {
  properties?: {
    shiftsFooter?: string;
  };
  actions?: {
    close?: string;
  };
};

/**
 * GuardListItem: formato reducido que produce useShiftsDerived
 * (aquí lo usamos internamente; lo convertimos a `Guard` cuando llamamos a CreateShift).
 */
type GuardListItem = {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

/**
 * Retorno tipado de useShiftsDerived (evita any al desestructurar).
 */
type UseShiftsDerivedReturn = {
  guardsAll: GuardListItem[];
  guardsFiltered: GuardListItem[];
  days: Date[];
  shiftsByGuardAndDate: Map<number, Record<string, Shift[]>>;
};

/**
 * Tipado reducido para la forma que PropertyShiftsTable podría usar al llamar openCreateForDate.
 * Mantener en sync con la definición en PropertyShiftsTable si la exporta.
 */
type SimpleGuard = {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export default function PropertyShiftsModal({ propertyId, propertyName, open, onClose }: Props) {
  // Tipamos TEXT con el fragmento reducido para evitar 'any'
  const { TEXT } = useI18n() as { TEXT?: UiTextFragment };

  // estados del modal + hooks
  const { shifts, loading, error, fetchShifts } = useShifts(propertyId);

  const [startDate, setStartDate] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewMode, setViewMode] = React.useState<"week" | "month" | "year">("week");
  const [guardSearch, setGuardSearch] = React.useState<string>("");

  // Forzamos el tipo del retorno para que guardsAll / guardsFiltered no sean any
  const {
    guardsAll,
    guardsFiltered,
    days,
    shiftsByGuardAndDate,
  } = useShiftsDerived(shifts, guardSearch, startDate, viewMode) as UseShiftsDerivedReturn;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createDate, setCreateDate] = React.useState<Date | null>(null);
  const [createGuardId, setCreateGuardId] = React.useState<number | null>(null);

  // aquí guardamos ya el tipo que CreateShift espera (Guard | null).
  const [createPreloadedGuard, setCreatePreloadedGuard] = React.useState<Guard | null>(null);

  const [actionShift, setActionShift] = React.useState<Shift | null>(null);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  const outerWrapperRef = React.useRef<HTMLDivElement | null>(null);

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

  // navigation helpers
  function moveBack() {
    if (viewMode === "week") {
      const nd = new Date(startDate); nd.setDate(startDate.getDate() - 7); setStartDate(nd);
    } else if (viewMode === "month") {
      const nd = new Date(startDate); nd.setMonth(startDate.getMonth() - 1, 1); nd.setHours(0, 0, 0, 0); setStartDate(nd);
    } else {
      const nd = new Date(startDate); nd.setFullYear(startDate.getFullYear() - 1, 0, 1); nd.setHours(0, 0, 0, 0); setStartDate(nd);
    }
  }
  function moveNext() {
    if (viewMode === "week") {
      const nd = new Date(startDate); nd.setDate(startDate.getDate() + 7); setStartDate(nd);
    } else if (viewMode === "month") {
      const nd = new Date(startDate); nd.setMonth(startDate.getMonth() + 1, 1); nd.setHours(0, 0, 0, 0); setStartDate(nd);
    } else {
      const nd = new Date(startDate); nd.setFullYear(startDate.getFullYear() + 1, 0, 1); nd.setHours(0, 0, 0, 0); setStartDate(nd);
    }
  }
  function goToday() {
    const nd = new Date(); nd.setHours(0, 0, 0, 0); setStartDate(nd);
  }

  // create handlers
  /**
   * openCreateForDateLocal:
   * - 'guard' puede venir en la forma que exponga PropertyShiftsTable (SimpleGuard)
   * - aquí lo convertimos a nuestro tipo Guard (asegurando firstName como string)
   */
  function openCreateForDateLocal(d: Date, guard?: SimpleGuard | null) {
    setCreateDate(d);
    setCreateGuardId(guard ? guard.id : null);

    if (guard) {
      // Convertimos/adaptamos la forma reducida a lo que espera el state (Guard)
      const adapted: Guard = {
        id: guard.id,
        firstName: guard.firstName ?? "",
        lastName: guard.lastName ?? "",
        email: guard.email ?? "",
        // si el tipo Guard necesita otros campos obligatorios, añádelos aquí con defaults
      } as unknown as Guard;
      setCreatePreloadedGuard(adapted);
    } else {
      setCreatePreloadedGuard(null);
    }

    setCreateOpen(true);
  }

  async function handleCreateDone(created?: Shift) {
    // cerrar modal y limpiar
    setCreateOpen(false);
    setCreateDate(null);
    setCreateGuardId(null);
    setCreatePreloadedGuard(null);

    if (created) {
      await fetchShifts();
      const gid = Number(created.guard ?? created.guardDetails?.id ?? -1);
      if (gid !== -1 && outerWrapperRef.current) {
        setTimeout(() => {
          try {
            const root = outerWrapperRef.current!;
            const el = root.querySelector(`[data-guard-row="guard-${gid}"]`) as HTMLElement | null;
            if (el) { el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
            else {
              const scrollable = root.querySelector('[style*="overflow-y: auto"]') as HTMLElement | null;
              if (scrollable) scrollable.scrollTop = 0;
            }
          } catch (err) { console.warn("scrollIntoView guard row failed:", err); }
        }, 60);
      }
      return;
    }

    await fetchShifts();
  }

  // keep signatures but mark parameters as used so eslint doesn't complain
  function handleEditDone(_: Shift) {
    void _; // mark as used
    setOpenEdit(false); setActionShift(null); fetchShifts();
  }
  function handleDeleteDone(_: number) {
    void _; // mark as used
    setOpenDelete(false); setActionShift(null); fetchShifts();
  }

  // table layout config
  const dayColMinWidth = viewMode === "week" ? 110 : 80;
  const maxVisibleGuards = 8;
  const rowHeight = 44;
  const bodyMaxHeight = maxVisibleGuards * rowHeight + 2;
  const tableMinWidth = React.useMemo(() => {
    const firstCol = 200;
    return firstCol + days.length * dayColMinWidth;
  }, [days.length, dayColMinWidth]);

  // minimal AppProperty (CreateShift espera AppProperty)
  const minimalProperty: AppProperty = React.useMemo(
    () => ({
      id: propertyId,
      ownerId: 0,
      name: propertyName ?? `#${propertyId}`,
      alias: undefined,
      address: propertyName ?? "",
      description: null,
      contractStartDate: null,
      createdAt: null,
      updatedAt: null,
      // ownerDetails optional in many APIs; si tu AppProperty lo requiere explícitamente,
      // ajusta aquí para proveer ownerDetails con shape correcto.
    }),
    [propertyId, propertyName]
  );

  // Convertir guardsAll (GuardListItem[]) a la forma que CreateShift espera (Guard[])
  const preloadedGuardsForCreate = React.useMemo<Guard[]>(
    () =>
      guardsAll.map((g) => {
        // aseguramos que campos obligatorios estén presentes (firstName/lastName/email como strings)
        return {
          id: g.id,
          firstName: g.firstName ?? "",
          lastName: g.lastName ?? "",
          email: g.email ?? "",
          // si el tipo Guard tiene más campos obligatorios, añádelos aquí con valores por defecto
        } as unknown as Guard;
      }),
    [guardsAll]
  );

  // cuando tengamos createPreloadedGuard en formato GuardListItem lo convertimos a Guard (si no es null)
  // (ya guardamos en createPreloadedGuard la forma Guard en openCreateForDateLocal)
  const createPreloadedGuardForCreate = React.useMemo<Guard | null>(() => {
    const g = createPreloadedGuard;
    if (!g) return null;
    return {
      id: g.id,
      firstName: g.firstName ?? "",
      lastName: g.lastName ?? "",
      email: g.email ?? "",
    } as unknown as Guard;
  }, [createPreloadedGuard]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent size="xl">
          <DialogHeader>
            <PropertyShiftsHeader
             
              propertyName={propertyName}
              propertyId={propertyId}
              viewMode={viewMode}
              setViewMode={setViewMode}
              guardSearch={guardSearch}
              setGuardSearch={setGuardSearch}
              days={days}
              moveBack={moveBack}
              moveNext={moveNext}
              goToday={goToday}
              onCreateClick={() => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                setCreateDate(today); setCreateGuardId(null); setCreatePreloadedGuard(null); setCreateOpen(true);
              }}
            />
          </DialogHeader>

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
                {TEXT?.properties?.shiftsFooter ?? "Usa los controles para navegar semanas/meses/años. Haz click en + para crear un turno o en un turno existente para ver acciones."}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  setCreateDate(today); setCreateGuardId(null); setCreatePreloadedGuard(null); setCreateOpen(true);
                }}>
                  Crear turno
                </Button>
                <Button variant="outline" onClick={onClose}>
                  {TEXT?.actions?.close ?? "Close"}
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
            setCreateOpen(false); setCreateDate(null); setCreateGuardId(null); setCreatePreloadedGuard(null);
          }}
          propertyId={propertyId}
          selectedDate={createDate}
          preselectedProperty={minimalProperty}
          preselectedService={undefined}
          preloadedProperties={[minimalProperty]}
          guardId={createGuardId ?? undefined}
          preloadedGuards={preloadedGuardsForCreate}
          preloadedGuard={createPreloadedGuardForCreate}
          onCreated={(shift) => {
            handleCreateDone(shift);
          }}
        />
      )}

      <ShiftActionsDialog
        shift={actionShift}
        open={!!actionShift && !openEdit && !openDelete}
        onClose={() => setActionShift(null)}
        onEdit={() => setOpenEdit(true)}
        onDelete={() => setOpenDelete(true)}
        TEXT={TEXT}
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
