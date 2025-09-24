// src/components/Properties/properties shifts content/PropertyShiftsModal.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

import CreateShift from "@/components/Shifts/Create/Create";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";

import { getCombinedFooterGaps } from "./coverageGaps";

import PropertyShiftsTable from "./PropertyShiftsTable";
import PropertyShiftsHeader from "./PropertyShiftsHeader";
import ShiftActionsDialog from "./ShiftActionsDialog";

import { useShifts } from "@/components/Properties/properties shifts content/hooks/useShifts";
import { useShiftsDerived } from "@/components/Properties/properties shifts content/hooks/useShiftsDerived";

import { listServicesByProperty } from "@/lib/services/services";
import type { Shift } from "@/components/Shifts/types";
import type { AppProperty } from "@/lib/services/properties";
import type { Guard } from "@/components/Guards/types";

type Props = {
  propertyId: number;
  propertyName?: string;
  propertyAlias?: string;
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

export default function PropertyShiftsModal({ propertyId, propertyName, propertyAlias, open, onClose }: Props) {
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
  const [selectedServiceId, setSelectedServiceId] = React.useState<number | null>(null);
  const [services, setServices] = React.useState<Array<{id: number, name: string, startTime: string | null, endTime: string | null, schedule: string[] | null}>>([]);
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(() => {
    const d = new Date();
    d.setDate(1); // Primer día del mes actual
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Encontrar el servicio seleccionado
  const selectedService = React.useMemo(() => {
    if (!selectedServiceId || !services.length) return null;
    return services.find(service => service.id === selectedServiceId) || null;
  }, [selectedServiceId, services]);

  // Forzamos el tipo del retorno para que guardsAll / guardsFiltered no sean any
  const {
    guardsAll,
    guardsFiltered,
    days,
    shiftsByGuardAndDate,
  } = useShiftsDerived(shifts, guardSearch, startDate, viewMode, selectedServiceId) as unknown as UseShiftsDerivedReturn;

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createDate, setCreateDate] = React.useState<Date | null>(null);
  const [createGuardId, setCreateGuardId] = React.useState<number | null>(null);

  // aquí guardamos ya el tipo que CreateShift espera (Guard | null).
  const [createPreloadedGuard, setCreatePreloadedGuard] = React.useState<Guard | null>(null);

  const [hoveredDay, setHoveredDay] = React.useState<Date | null>(null);

  const [actionShift, setActionShift] = React.useState<Shift | null>(null);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);

  const outerWrapperRef = React.useRef<HTMLDivElement | null>(null);

  // Función para hacer scroll hasta el día de hoy
  const scrollToToday = React.useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Encontrar el índice del día de hoy en el array days
    const todayIndex = days.findIndex(day => 
      day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate()
    );
    
    if (todayIndex !== -1 && outerWrapperRef.current) {
      // Calcular la posición horizontal: índice * ancho mínimo de columna
      const dayColWidth = 100; // dayColMinWidth
      const scrollLeft = todayIndex * dayColWidth;
      
      // Buscar el elemento scrollable (bodyRightRef en PropertyShiftsTable)
      const scrollableElement = outerWrapperRef.current.querySelector('.hide-horizontal-scrollbar') as HTMLElement;
      if (scrollableElement) {
        scrollableElement.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [days]);

  // useEffect para hacer scroll cuando se cambia a la fecha de hoy
  React.useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Si startDate es hoy, hacer scroll después de un delay
    if (startDate.getTime() === today.getTime()) {
      const timer = setTimeout(() => scrollToToday(), 300);
      return () => clearTimeout(timer);
    }
  }, [startDate, scrollToToday]);

  // useEffect para actualizar selectedMonth cuando cambia startDate
  React.useEffect(() => {
    const monthStart = new Date(startDate);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    setSelectedMonth(monthStart);
  }, [startDate]);

  React.useEffect(() => {
    if (actionShift && !openEdit && !openDelete) {
      setOpenEdit(true);
    }
  }, [actionShift, openEdit, openDelete]);

  React.useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchShifts();
      
      // Load services for the property
      try {
        const response = await listServicesByProperty(propertyId, 1, "", 100);
        if (!mounted) return;
        
        // Extract services array from different response formats
        let servicesList: Array<{id: number, name: string, startTime: string | null, endTime: string | null, schedule: string[] | null}> = [];
        if (Array.isArray(response)) {
          servicesList = response.map((service: any) => ({
            id: service.id,
            name: service.name,
            startTime: service.startTime || service.start_time || null,
            endTime: service.endTime || service.end_time || null,
            schedule: service.schedule || null,
          }));
        } else if (response?.items) {
          servicesList = response.items.map((service: any) => ({
            id: service.id,
            name: service.name,
            startTime: service.startTime || service.start_time || null,
            endTime: service.endTime || service.end_time || null,
            schedule: service.schedule || null,
          }));
        } else if ((response as any)?.results) {
          servicesList = (response as any).results.map((service: any) => ({
            id: service.id,
            name: service.name,
            startTime: service.startTime || service.start_time || null,
            endTime: service.endTime || service.end_time || null,
            schedule: service.schedule || null,
          }));
        }
        
        setServices(servicesList);
      } catch (err) {
        console.error("Error loading property services:", err);
        setServices([]);
      }
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
    // El scroll se hará automáticamente con el useEffect
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

  React.useEffect(() => {
    if (actionShift && !openEdit && !openDelete) {
      setOpenEdit(true);
    }
  }, [actionShift, openEdit, openDelete]);

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
  const dayColMinWidth = 100;
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

  // Función para calcular las brechas de cobertura para mostrar en el footer
  const getFooterCoverageGaps = React.useMemo(() => {
    return getCombinedFooterGaps(hoveredDay, selectedService, services, shiftsByGuardAndDate);
  }, [hoveredDay, selectedService, services, shiftsByGuardAndDate]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent size="xl" className="sm:max-w-[81.6rem]">
          <DialogHeader>
            <PropertyShiftsHeader
             
              propertyName={propertyName}
              propertyAlias={propertyAlias}
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
              services={services}
              selectedServiceId={selectedServiceId}
              onServiceChange={setSelectedServiceId}
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
            />
          </DialogHeader>

          <div className="overflow-x-hidden">
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
              selectedService={selectedService}
              services={services}
              onDayHover={setHoveredDay}
            />
          </div>

          <DialogFooter>
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-muted-foreground pt-3">
                {hoveredDay && getFooterCoverageGaps ? (
                  getFooterCoverageGaps.length > 0 ? (
                    <div>
                      {getFooterCoverageGaps.map((gap, index) => (
                        <div key={index}>{gap}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-green-600 font-medium">Todo cubierto</div>
                  )
                ) : (
                  <div className="font-medium">Pasa el mouse sobre un día para ver su estado de cobertura</div>
                )}
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
          onClose={() => { setOpenEdit(false); setActionShift(null); }}
          shiftId={actionShift.id}
          initialShift={actionShift}
          onUpdated={(s) => handleEditDone(s)}
          onDeleted={(id) => handleDeleteDone(id)}
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
