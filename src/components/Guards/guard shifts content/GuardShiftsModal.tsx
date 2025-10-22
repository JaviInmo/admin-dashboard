// src/components/Guards/guard shifts content/GuardShiftsModal.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

import CreateShift from "@/components/Shifts/Create/Create";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";

import GuardShiftsTable from "@/components/Guards/guard shifts content/GuardShiftsTable";
import GuardShiftsHeader from "@/components/Guards/guard shifts content/GuardShiftsHeader";
import ShiftActionsDialog from "@/components/Guards/guard shifts content/ShiftActionsDialog";

import { useShifts } from "@/components/Guards/guard shifts content/hooks/useShifts";
import { useShiftsDerived } from "@/components/Guards/guard shifts content/hooks/useShiftsDerived";
import { listProperties } from "@/lib/services/properties";

import type { Shift } from "@/components/Shifts/types";
import type { AppProperty } from "@/lib/services/properties";
import type { Guard } from "@/components/Guards/types";

/**
 * Props del modal: guardId (contexto), nombre opcional, control de apertura.
 */
type Props = {
  guardId: number;
  guardName?: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Fragmento de tipos para TEXT (solo las claves usadas aquí).
 */
type UiTextFragment = {
  guards?: {
    shiftsFooter?: string;
  };
  actions?: {
    close?: string;
  };
};

/**
 * SimpleProperty: esta definición debe coincidir con la usada en GuardShiftsTable
 * (name es string requerido).
 */
type SimpleProperty = {
  id: number;
  name: string;
  alias?: string;
  address?: string;
};

/**
 * Retorno tipado de useShiftsDerived de guards.
 * (asume que useShiftsDerived exporta propiedades con name: string)
 */
type UseShiftsDerivedReturn = {
  propertiesAll: SimpleProperty[];
  propertiesFiltered: SimpleProperty[];
  days: Date[];
  shiftsByPropertyAndDate: Map<number, Record<string, Shift[]>>;
};

export default function GuardShiftsModal({ guardId, guardName, open, onClose }: Props) {
  // TEXT tipado a fragmento mínimo
  const { TEXT } = useI18n() as { TEXT?: UiTextFragment };

  // hooks
  const { shifts, loading, error, fetchShifts } = useShifts(guardId);

  const [startDate, setStartDate] = React.useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewMode, setViewMode] = React.useState<"week" | "month" | "year">("week");
  const [propertySearch, setPropertySearch] = React.useState<string>("");
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(1); // primer día del mes actual
    return d;
  });

  // Load all properties for create shift
  const [allProperties, setAllProperties] = React.useState<AppProperty[]>([]);

  // useEffect para actualizar selectedMonth cuando cambia startDate
  React.useEffect(() => {
    const monthStart = new Date(startDate);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    setSelectedMonth(monthStart);
  }, [startDate]);

  const {
    propertiesFiltered,
    days,
    shiftsByPropertyAndDate,
  } = useShiftsDerived(shifts, propertySearch, startDate, viewMode) as unknown as UseShiftsDerivedReturn;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createDate, setCreateDate] = React.useState<Date | null>(null);
  const [createPropertyId, setCreatePropertyId] = React.useState<number | null>(null);

  // preloaded guard (lo que CreateShift espera) — minimal guard usando el contexto del modal
  const minimalGuard: Guard = React.useMemo(
    () =>
      ({
        id: guardId,
        firstName: guardName ?? "",
        lastName: "",
        email: "",
        // añade otros campos obligatorios si tu tipo Guard los requiere
      } as unknown as Guard),
    [guardId, guardName]
  );

  // preloaded property a enviar a CreateShift cuando se abre desde una celda concreta
  const [createPreloadedProperty, setCreatePreloadedProperty] = React.useState<AppProperty | null>(null);

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
  }, [open, guardId, fetchShifts]);

  // Load all properties when modal opens
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const response = await listProperties(1, "", 1000); // Load all properties
        if (!mounted) return;
        const properties = response.items || [];
        setAllProperties(properties);
      } catch (err) {
        console.error("Error loading all properties:", err);
        setAllProperties([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

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

  // Función para manejar el cambio de mes seleccionado
  function handleMonthChange(month: Date) {
    setSelectedMonth(month);
    // Cambiar automáticamente a vista de mes y navegar al mes seleccionado
    setViewMode("month");
    const newStartDate = new Date(month);
    newStartDate.setDate(1); // Primer día del mes
    newStartDate.setHours(0, 0, 0, 0);
    setStartDate(newStartDate);
  }

  // openCreateForDateLocal: recibe la propiedad (SimpleProperty) y la mapea a AppProperty mínimo
  function openCreateForDateLocal(d: Date, property?: SimpleProperty | null) {
    setCreateDate(d);
    setCreatePropertyId(property ? property.id : null);

    if (property) {
      const minimalProperty: AppProperty = {
        id: property.id,
        ownerId: 0,
        name: property.name ?? `#${property.id}`, // por seguridad aunque name es string ya
        alias: property.alias,
        address: property.address ?? "",
        description: null,
        contractStartDate: null,
        createdAt: null,
        updatedAt: null,
        // ownerDetails omitted — añade si tu AppProperty lo requiere
      } as unknown as AppProperty;
      setCreatePreloadedProperty(minimalProperty);
    } else {
      setCreatePreloadedProperty(null);
    }

    setCreateOpen(true);
  }

  async function handleCreateDone(created?: Shift) {
    setCreateOpen(false);
    setCreateDate(null);
    setCreatePropertyId(null);
    setCreatePreloadedProperty(null);

    if (created) {
      await fetchShifts();
      const pid = Number(created.property ?? created.propertyDetails?.id ?? -1);
      if (pid !== -1 && outerWrapperRef.current) {
        setTimeout(() => {
          try {
            const root = outerWrapperRef.current!;
            const el = root.querySelector(`[data-property-row="property-${pid}"]`) as HTMLElement | null;
            if (el) { el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
            else {
              const scrollable = root.querySelector('[style*="overflow-y: auto"]') as HTMLElement | null;
              if (scrollable) scrollable.scrollTop = 0;
            }
          } catch (err) { console.warn("scrollIntoView property row failed:", err); }
        }, 60);
      }
      return;
    }

    await fetchShifts();
  }

  // keep signatures but mark parameters as used so eslint doesn't complain
  function handleEditDone(_: Shift) {
    void _;
    setOpenEdit(false); setActionShift(null); fetchShifts();
  }
  function handleDeleteDone(_: number) {
    void _;
    setOpenDelete(false); setActionShift(null); fetchShifts();
  }

  // table layout config
  const dayColMinWidth = viewMode === "week" ? 110 : 80;
  const maxVisibleProperties = 8;
  const rowHeight = 44;
  const bodyMaxHeight = maxVisibleProperties * rowHeight + 2;
  const tableMinWidth = React.useMemo(() => {
    const firstCol = 200;
    return firstCol + days.length * dayColMinWidth;
  }, [days.length, dayColMinWidth]);

  // minimal preloadedProperties (CreateShift espera AppProperty[]) — usamos allProperties
  const preloadedPropertiesForCreate = React.useMemo<AppProperty[]>(
    () =>
      allProperties.map((p) => ({
        id: p.id,
        ownerId: p.ownerId,
        name: p.name ?? `#${p.id}`,
        alias: p.alias,
        address: p.address ?? "",
        description: p.description ?? null,
        contractStartDate: p.contractStartDate ?? null,
        createdAt: p.createdAt ?? null,
        updatedAt: p.updatedAt ?? null,
      } as unknown as AppProperty)),
    [allProperties]
  );

  // minimal preloadedGuard array (CreateShift espera Guard[])
  const preloadedGuardsForCreate = React.useMemo<Guard[]>(
    () => [
      {
        id: minimalGuard.id,
        firstName: minimalGuard.firstName ?? "",
        lastName: minimalGuard.lastName ?? "",
        email: minimalGuard.email ?? "",
      } as unknown as Guard,
    ],
    [minimalGuard]
  );

  // createPreloadedGuardForCreate (pass to CreateShift as preloadedGuard)
  const createPreloadedGuardForCreate = React.useMemo<Guard | null>(() => {
    return minimalGuard ? ({ id: minimalGuard.id, firstName: minimalGuard.firstName ?? "", lastName: minimalGuard.lastName ?? "", email: minimalGuard.email ?? "" } as unknown as Guard) : null;
  }, [minimalGuard]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent size="xl">
          <DialogHeader>
            <GuardShiftsHeader
             
              guardName={guardName}
              guardId={guardId}
              viewMode={viewMode}
              setViewMode={setViewMode}
              propertySearch={propertySearch}
              setPropertySearch={setPropertySearch}
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              days={days}
              moveBack={moveBack}
              moveNext={moveNext}
              goToday={goToday}
              onCreateClick={() => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                setCreateDate(today); setCreatePropertyId(null); setCreatePreloadedProperty(null); setCreateOpen(true);
              }}
            />
          </DialogHeader>

          <div className="max-w-7xl overflow-x-hidden">
            <GuardShiftsTable
              days={days}
              propertiesFiltered={propertiesFiltered}
              shiftsByPropertyAndDate={shiftsByPropertyAndDate}
              openCreateForDate={openCreateForDateLocal}
              setActionShift={setActionShift}
              loading={loading}
              error={error}
              dayColMinWidth={dayColMinWidth}
              tableMinWidth={tableMinWidth}
              bodyMaxHeight={propertiesFiltered.length > 8 ? `${bodyMaxHeight}px` : undefined}
              rowHeight={rowHeight}
              outerWrapperRef={outerWrapperRef}
            />
          </div>

          <DialogFooter>
            <div className="flex justify-between items-center w-full">
              <div className="text-xs text-muted-foreground pt-3">
                {TEXT?.guards?.shiftsFooter ?? "Usa los controles para navegar semanas/meses/años. Haz click en + para crear un turno o en un turno existente para ver acciones."}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  setCreateDate(today); setCreatePropertyId(null); setCreatePreloadedProperty(null); setCreateOpen(true);
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
            setCreateOpen(false); setCreateDate(null); setCreatePropertyId(null); setCreatePreloadedProperty(null);
          }}
          // When creating from a guard modal we pass the guard preselected and optionally a property
          propertyId={createPropertyId ?? undefined}
          selectedDate={createDate}
          preselectedProperty={createPreloadedProperty ?? undefined}
          preselectedService={undefined}
          preloadedProperties={preloadedPropertiesForCreate}
          // prefill guard with the current guard
          guardId={minimalGuard.id}
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
