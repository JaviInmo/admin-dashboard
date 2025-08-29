// src/components/Guards/GuardDetailsModal.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, User, CreditCard, Copy, Eye, EyeOff } from "lucide-react";
import type { Guard } from "./types";
import { ClickableEmail } from "@/components/ui/clickable-email";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

import CreateShift from "@/components/Shifts/Create/Create";
import ShowShift from "@/components/Shifts/Show/Show";
import EditShift from "@/components/Shifts/Edit/Edit";
import DeleteShift from "@/components/Shifts/Delete/Delete";
import type { Shift } from "@/components/Shifts/types";
import { listShiftsByGuard } from "@/lib/services/shifts";

type GuardDetailsModalProps = {
  guard: Guard;
  open: boolean;
  onClose: () => void;
};

/**
 * Modal de detalles de guardia + integración completa de turnos:
 * - ver (ShowShift)
 * - crear (CreateShift)
 * - editar (EditShift)
 * - borrar (DeleteShift)
 *
 * UX: lista compacta de turnos (paginada por "Cargar más"), botones para acciones por turno,
 * y modales independientes que actualizan la lista en cuanto ocurre la acción.
 */
export default function GuardDetailsModal({
  guard,
  open,
  onClose,
}: GuardDetailsModalProps) {
  const { TEXT } = useI18n();

  const fullName = React.useMemo(() => {
    const first = guard.firstName || "";
    const last = guard.lastName || "";
    return `${first} ${last}`.trim() || `Usuario #${guard.id}`;
  }, [guard]);

  const initials = React.useMemo(() => {
    const first = guard.firstName || "";
    const last = guard.lastName || "";
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    if (first) return first.slice(0, 2).toUpperCase();
    if (last) return last.slice(0, 2).toUpperCase();
    return "G";
  }, [guard]);

  function formatDateMaybe(dateish?: string | null | undefined) {
    if (!dateish) return "-";
    try {
      const d = new Date(dateish);
      if (Number.isNaN(d.getTime())) return String(dateish);
      return d.toLocaleDateString();
    } catch {
      return String(dateish);
    }
  }

  function normalizePhoneForWhatsapp(raw?: string | null): string {
    if (!raw) return "";
    const trimmed = String(raw).trim();
    let cleaned = trimmed.replace(/[\s().\-]/g, "");
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.slice(1);
      return cleaned.replace(/^0+/, "");
    }
    if (cleaned.startsWith("00")) {
      cleaned = cleaned.replace(/^00+/, "");
      return cleaned;
    }
    const digits = cleaned.replace(/\D+/g, "");
    return digits;
  }

  // Estado local para mostrar/ocultar SSN en la UI (por defecto oculto)
  const [showSsn, setShowSsn] = React.useState<boolean>(false);

  // Sincronizar cuando cambia el guard (por defecto oculto)
  React.useEffect(() => {
    setShowSsn(false);
  }, [guard]);

  async function copyToClipboard(text?: string | null) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(TEXT?.actions?.copySuccess ?? "Copied");
    } catch {
      toast.error(TEXT?.actions?.copyError ?? "Could not copy");
    }
  }

  const checkboxLabel = (TEXT?.guards?.form?.actions?.showSsn as string) ?? "Show SSN";

  // ---------------- Shifts state & handlers ----------------
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [shiftsPage, setShiftsPage] = React.useState<number>(1);
  const [shiftsLoading, setShiftsLoading] = React.useState<boolean>(false);
  const [shiftsHasNext, setShiftsHasNext] = React.useState<boolean>(false);

  // Modales de shifts
  const [openCreate, setOpenCreate] = React.useState<boolean>(false);
  const [openShowShiftId, setOpenShowShiftId] = React.useState<number | null>(null);
  const [openEditShiftId, setOpenEditShiftId] = React.useState<number | null>(null);
  const [openDeleteShiftId, setOpenDeleteShiftId] = React.useState<number | null>(null);

  // Cargar la primera página de turnos cuando se abre el modal
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;

    async function fetchFirst() {
      setShiftsLoading(true);
      setShifts([]);
      setShiftsPage(1);
      try {
        const res = await listShiftsByGuard(guard.id, 1, 5, "-start_time");
        const results = (res as any)?.results ?? (res as any) ?? [];
        const next = (res as any)?.next ?? null;
        if (!mounted) return;
        setShifts(Array.isArray(results) ? results : []);
        setShiftsHasNext(Boolean(next));
      } catch (err) {
        console.error(err);
        toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts");
      } finally {
        if (mounted) setShiftsLoading(false);
      }
    }

    fetchFirst();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guard.id]);

  // Cargar página siguiente
  async function loadMoreShifts() {
    const nextPage = shiftsPage + 1;
    setShiftsLoading(true);
    try {
      const res = await listShiftsByGuard(guard.id, nextPage, 5, "-start_time");
      const results = (res as any)?.results ?? [];
      const next = (res as any)?.next ?? null;
      setShifts((prev) => [...prev, ...(Array.isArray(results) ? results : [])]);
      setShiftsPage(nextPage);
      setShiftsHasNext(Boolean(next));
    } catch (err) {
      console.error(err);
      toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts");
    } finally {
      setShiftsLoading(false);
    }
  }

  // Cuando se crea un turno (desde CreateShift), lo añadimos arriba
  function handleShiftCreated(newShift: Shift) {
    setShifts((prev) => [newShift, ...prev]);
    setOpenCreate(false);
    toast.success(TEXT?.shifts?.messages?.created ?? "Shift created");
  }

  // Cuando se actualiza un turno (desde Show/Edit), actualizamos la lista
  function handleShiftUpdated(updated: Shift) {
    setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setOpenShowShiftId(null);
    setOpenEditShiftId(null);
    setOpenDeleteShiftId(null);
    toast.success(TEXT?.shifts?.messages?.updated ?? "Shift updated");
  }

  // Cuando se elimina un turno (desde Delete o Show), lo quitamos
  function handleShiftDeleted(id: number) {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    setOpenShowShiftId(null);
    setOpenEditShiftId(null);
    setOpenDeleteShiftId(null);
    toast.success(TEXT?.shifts?.messages?.deleted ?? "Shift deleted");
  }

  // ---------------- UI ----------------
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) onClose();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 w-full">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xl font-semibold shadow">
                  {initials}
                </div>
                <div>
                  <DialogTitle className="text-lg leading-5">{fullName}</DialogTitle>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">ID: {guard.id}</div>
                    <Badge variant="secondary" className="text-xs">
                      {TEXT?.guards?.table?.title ? TEXT.guards.table.title.replace(" List", "") : "Guardia"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick actions (right side) */}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setOpenCreate(true)}>
                  {TEXT?.shifts?.create?.title ?? TEXT?.actions?.create ?? "Asignar turno"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-1 gap-6">
            <div className="mt-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label={TEXT?.guards?.table?.headers?.firstName ?? "Nombre"}
                  value={guard.firstName || "-"}
                />
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label={TEXT?.guards?.table?.headers?.lastName ?? "Apellido"}
                  value={guard.lastName || "-"}
                />
                <InfoItem
                  icon={<Mail className="h-4 w-4" />}
                  label={TEXT?.guards?.table?.headers?.email ?? "Correo"}
                  value={
                    guard.email ? <ClickableEmail email={guard.email} /> : "-"
                  }
                />
                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label={TEXT?.guards?.table?.headers?.phone ?? "Teléfono"}
                  value={
                    guard.phone ? (
                      <a
                        href={`https://wa.me/${encodeURIComponent(
                          normalizePhoneForWhatsapp(guard.phone),
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        title="Abrir en WhatsApp"
                      >
                        {guard.phone}
                      </a>
                    ) : (
                      "-"
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <InfoItem
                  icon={<CreditCard className="h-4 w-4" />}
                  label={TEXT?.guards?.table?.headers?.ssn ?? "DNI/SSN"}
                  value={
                    guard.ssn ? (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {/* Ícono de ojo a la izquierda */}
                          <button
                            type="button"
                            onClick={() => setShowSsn((v) => !v)}
                            title={showSsn ? "Ocultar SSN" : "Mostrar SSN"}
                            className="inline-flex items-center rounded px-1 py-1 text-sm hover:bg-muted/30"
                          >
                            {showSsn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>

                          <span className="font-medium">
                            {showSsn ? guard.ssn : (TEXT?.guards?.table?.ssnHidden ?? "******")}
                          </span>

                          {/* botón copiar solo si está visible */}
                          {showSsn && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(guard.ssn)}
                              title={TEXT?.actions?.copy ?? "Copy"}
                              className="inline-flex items-center rounded px-2 py-1 text-sm hover:bg-muted/30"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="mt-0 sm:mt-0 flex items-center gap-2">
                          <input
                            id={`toggle-ssn-${guard.id}`}
                            type="checkbox"
                            checked={showSsn}
                            onChange={() => setShowSsn((v) => !v)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor={`toggle-ssn-${guard.id}`} className="text-sm">
                            {checkboxLabel}
                          </label>
                        </div>
                      </div>
                    ) : (
                      "-"
                    )
                  }
                />
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label={TEXT?.guards?.table?.headers?.birthdate ?? "Fecha de Nacimiento"}
                  value={formatDateMaybe(guard.birthdate)}
                />
              </div>

              {guard.address && (
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label={TEXT?.guards?.form?.fields?.address ?? "Dirección"}
                  value={guard.address}
                />
              )}
            </div>

            {/* ---------------- Shifts list ---------------- */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {TEXT?.shifts?.show?.title ?? "Turnos"}
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    {shifts.length > 0 ? `${shifts.length}` : TEXT?.table?.noData}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setOpenCreate(true)}>
                    {TEXT?.shifts?.create?.title ?? TEXT?.actions?.create ?? "Asignar"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {shiftsLoading ? (
                  <div className="text-sm text-muted-foreground">{TEXT?.common?.loading ?? "Loading..."}</div>
                ) : shifts.length === 0 ? (
                  <div className="rounded border border-dashed border-muted/50 p-4 text-sm text-muted-foreground">
                    {TEXT?.table?.noData ?? "No hay turnos"}
                  </div>
                ) : (
                  shifts.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-md border p-3 shadow-sm bg-card"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-muted-foreground">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {new Date(s.startTime).toLocaleString()} — {new Date(s.endTime).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.status} · {s.hoursWorked}h · Property: {s.property}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Ver (abre ShowShift) */}
                        <Button size="sm" variant="ghost" onClick={() => setOpenShowShiftId(s.id)}>
                          {TEXT?.actions?.edit ?? "Ver"}
                        </Button>

                        {/* Editar (abre EditShift) */}
                        <Button size="sm" variant="outline" onClick={() => setOpenEditShiftId(s.id)}>
                          {TEXT?.actions?.save ?? "Editar"}
                        </Button>

                        {/* Eliminar (abre DeleteShift) */}
                        <Button size="sm" variant="destructive" onClick={() => setOpenDeleteShiftId(s.id)}>
                          {TEXT?.actions?.delete ?? "Eliminar"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {shiftsHasNext && (
                <div className="mt-3 flex justify-center">
                  <Button size="sm" variant="outline" onClick={loadMoreShifts} disabled={shiftsLoading}>
                    {shiftsLoading ? (TEXT?.common?.loading ?? "Loading...") : (TEXT?.actions?.refresh ?? "Cargar más")}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={onClose}>
                {TEXT?.actions?.close ?? "Close"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Modales independientes ---------------- */}

      {/* Create Shift modal */}
      <CreateShift
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        guardId={guard.id}
        onCreated={handleShiftCreated}
      />

      {/* Show / Edit / Delete via ShowShift (ShowShift includes Edit/Delete inside it) */}
      {openShowShiftId !== null && (
        <ShowShift
          open={openShowShiftId !== null}
          onClose={() => setOpenShowShiftId(null)}
          shiftId={openShowShiftId as number}
          onUpdated={handleShiftUpdated}
          onDeleted={handleShiftDeleted}
        />
      )}

      {/* Edit modal direct */}
      {openEditShiftId !== null && (
        <EditShift
          open={openEditShiftId !== null}
          onClose={() => setOpenEditShiftId(null)}
          shiftId={openEditShiftId as number}
          onUpdated={handleShiftUpdated}
        />
      )}

      {/* Delete modal direct */}
      {openDeleteShiftId !== null && (
        <DeleteShift
          open={openDeleteShiftId !== null}
          onClose={() => setOpenDeleteShiftId(null)}
          shiftId={openDeleteShiftId as number}
          onDeleted={handleShiftDeleted}
        />
      )}
    </>
  );
}

/**
 * Componente helper para mostrar label + icon + value
 */
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-muted-foreground">{icon}</div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
