// src/components/Guards/GuardDetailsAndShiftsModals.tsx
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
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
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

/**
 * Normaliza la respuesta del backend a la forma `Shift` que espera la UI.
 * Soporta: array directo, { results: [...] }, { items: [...] }, items con snake_case o camelCase,
 * y campos anidados como guard_details / property_details.
 */
function normalizeShiftsArray(input: any): Shift[] {
  if (!input) return [];
  const arr = Array.isArray(input)
    ? input
    : Array.isArray(input?.results)
    ? input.results
    : Array.isArray(input?.items)
    ? input.items
    : null;
  if (!arr) return [];
  return arr.map((s: any) => {
    const guardId =
      s.guard ??
      s.guard_id ??
      (s.guard_details ? s.guard_details.id ?? s.guard_details.pk ?? undefined : undefined) ??
      (s.guard && typeof s.guard === "object" ? s.guard.id : undefined);

    const propertyId =
      s.property ??
      s.property_id ??
      (s.property_details ? s.property_details.id ?? s.property_details.pk ?? undefined : undefined) ??
      (s.property && typeof s.property === "object" ? s.property.id : undefined);

    return {
      id: s.id ?? s.pk ?? 0,
      guard: guardId,
      property: propertyId,
      startTime: s.start_time ?? s.startTime ?? s.start ?? null,
      endTime: s.end_time ?? s.endTime ?? s.end ?? null,
      status: s.status ?? "scheduled",
      hoursWorked: s.hours_worked ?? s.hoursWorked ?? s.hours ?? 0,
      isActive: s.is_active ?? s.isActive ?? true,
      // mantengo el raw por si quieres leer property_details/guard_details en la UI
      __raw: s,
    } as Shift;
  });
}

type GuardDetailsModalProps = {
  guard: Guard;
  open: boolean;
  onClose: () => void;
};

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

  // Estado preview de turnos para mostrar lista inmediatamente al abrir el modal de Shifts
  const [previewShifts, setPreviewShifts] = React.useState<Shift[]>([]);
  const [previewLoading, setPreviewLoading] = React.useState<boolean>(false);
  const [previewHasNext, setPreviewHasNext] = React.useState<boolean>(false);

  // Abrir modal de turnos (separado)
  const [openShifts, setOpenShifts] = React.useState<boolean>(false);

  // Reset cuando cambia el guard (se usa para resetear UI)
  React.useEffect(() => {
    setShowSsn(false);
    setPreviewShifts([]);
    setPreviewHasNext(false);
  }, [guard]);

  // Prefetch de la primera página de turnos cuando se abre el Details (mini-preview)
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;
    async function fetchPreview() {
      setPreviewLoading(true);
      try {
        const res = await listShiftsByGuard(guard.id, 1, 10, "-start_time");
        console.log("[Preview] listShiftsByGuard response:", res);
        const normalized = normalizeShiftsArray(res);
        if (!mounted) return;
        setPreviewShifts(normalized);
        // detectar next en varias formas (next o previous-style)
        setPreviewHasNext(Boolean(res?.next ?? res?.previous ?? false));
      } catch (err) {
        console.error("[Preview] error fetching shifts:", err);
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    }
    fetchPreview();
    return () => {
      mounted = false;
    };
  }, [open, guard.id]);

  async function copyToClipboard(text?: string | null) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(TEXT?.actions?.copySuccess ?? "Copied");
    } catch {
      toast.error(TEXT?.actions?.copyError ?? "Could not copy");
    }
  }

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
                  value={guard.email ? <ClickableEmail email={guard.email} /> : "-"}
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

            {/* Mini-card resumen de turnos: muestra preview y botón para abrir modal de turnos */}
            <div className="rounded border p-4 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{TEXT?.shifts?.show?.title ?? "Turnos"}</h3>
                  <div className="text-xs text-muted-foreground">
                    {previewLoading ? (TEXT?.common?.loading ?? "Loading...") : `${previewShifts.length} ${TEXT?.table?.items ?? "items"}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setOpenShifts(true)}>
                    {TEXT?.shifts?.show?.open ?? "Ver turnos"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={onClose}>{TEXT?.actions?.close ?? "Close"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Turnos separado. Le pasamos el preview (si existe) */}
      <GuardShiftsModal
        guardId={guard.id}
        guardName={fullName}
        open={openShifts}
        onClose={() => setOpenShifts(false)}
        initialShifts={previewShifts}
        initialHasNext={previewHasNext}
      />
    </>
  );
}

function GuardShiftsModal({
  guardId,
  guardName,
  open,
  onClose,
  initialShifts,
  initialHasNext,
}: {
  guardId: number;
  guardName?: string;
  open: boolean;
  onClose: () => void;
  initialShifts?: Shift[];
  initialHasNext?: boolean;
}) {
  const { TEXT } = useI18n();

  const [shifts, setShifts] = React.useState<Shift[]>(initialShifts ?? []);
  const [page, setPage] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [hasNext, setHasNext] = React.useState<boolean>(initialHasNext ?? false);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [openShowId, setOpenShowId] = React.useState<number | null>(null);
  const [openEditId, setOpenEditId] = React.useState<number | null>(null);
  const [openDeleteId, setOpenDeleteId] = React.useState<number | null>(null);

  // Al abrir: usa initialShifts (si hay) para prefill, y luego hace fetch real
  React.useEffect(() => {
    if (!open) return;
    let mounted = true;

    // prefill inmediato si existen
    if (initialShifts && initialShifts.length) {
      setShifts(initialShifts);
      setHasNext(Boolean(initialHasNext));
    }

    async function fetchFirst() {
      setLoading(true);
      try {
        const res = await listShiftsByGuard(guardId, 1, 10, "-start_time");
        console.log("[Modal] listShiftsByGuard response:", res);
        const normalized = normalizeShiftsArray(res);
        if (!mounted) return;
        setShifts(normalized);
        setPage(1);
        setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));
      } catch (err) {
        console.error("[Modal] error fetching shifts:", err);
        toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFirst();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guardId]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await listShiftsByGuard(guardId, nextPage, 10, "-start_time");
      console.log("[LoadMore] response:", res);
      const newItems = normalizeShiftsArray(res);
      setShifts((p) => [...p, ...newItems]);
      setPage(nextPage);
      setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false));
    } catch (err) {
      console.error("[LoadMore] error:", err);
      toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts");
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(s: Shift) {
    setShifts((p) => [s, ...p]);
    setOpenCreate(false);
    toast.success(TEXT?.shifts?.messages?.created ?? "Shift created");
  }
  function handleUpdated(s: Shift) {
    setShifts((p) => p.map((x) => (x.id === s.id ? s : x)));
    setOpenShowId(null);
    setOpenEditId(null);
    setOpenDeleteId(null);
    toast.success(TEXT?.shifts?.messages?.updated ?? "Shift updated");
  }
  function handleDeleted(id: number) {
    setShifts((p) => p.filter((x) => x.id !== id));
    setOpenShowId(null);
    setOpenEditId(null);
    setOpenDeleteId(null);
    toast.success(TEXT?.shifts?.messages?.deleted ?? "Shift deleted");
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between w-full pt-3.5">
            <div >
              <DialogTitle className="text-lg">{guardName ? `${TEXT?.shifts?.show?.title ?? "Turnos"} — ${guardName}` : (TEXT?.shifts?.show?.title ?? "Turnos")}</DialogTitle>
              <div className="text-xs text-muted-foreground">{TEXT?.shifts?.show?.subtitle ?? "Lista de turnos (scrollable)"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setOpenCreate(true)}>{TEXT?.shifts?.create?.title ?? TEXT?.actions?.create ?? "Asignar"}</Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable container for the list */}
        <div className="max-h-[60vh] overflow-auto p-2 space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">{TEXT?.common?.loading ?? "Loading..."}</div>
          ) : shifts.length === 0 ? (
            <div className="rounded border border-dashed border-muted/50 p-4 text-sm text-muted-foreground">{TEXT?.table?.noData ?? "No hay turnos"}</div>
          ) : (
            shifts.map((s) => {
              const raw = (s as any).__raw;
              const propertyLabel = raw?.property_details?.name ?? raw?.property_details?.alias ?? s.property;
              return (
                <div key={s.id} className="flex items-center justify-between gap-4 rounded-md border p-3 shadow-sm bg-card">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-muted-foreground"><Calendar className="h-5 w-5" /></div>
                    <div>
                      <div className="text-sm font-medium">
                        {s.startTime ? new Date(s.startTime).toLocaleString() : "—"} — {s.endTime ? new Date(s.endTime).toLocaleString() : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.status} · {s.hoursWorked}h · {propertyLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ver / Show */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenShowId(s.id)}
                      title={TEXT?.actions?.view ?? "Ver"}
                    >
                      {TEXT?.actions?.view ?? "Ver"}
                    </Button>

                    {/* Edit */}
                    <Button size="sm" variant="outline" onClick={() => setOpenEditId(s.id)}>{TEXT?.actions?.edit ?? "Editar"}</Button>
                    {/* Delete */}
                    <Button size="sm" variant="destructive" onClick={() => setOpenDeleteId(s.id)}>{TEXT?.actions?.delete ?? "Eliminar"}</Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {hasNext && (
          <div className="mt-3 flex justify-center">
            <Button size="sm" variant="outline" onClick={loadMore} disabled={loading}>{loading ? (TEXT?.common?.loading ?? "Loading...") : (TEXT?.actions?.refresh ?? "Cargar más")}</Button>
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose}>{TEXT?.actions?.close ?? "Close"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Child modals for create/show/edit/delete */}
      <CreateShift open={openCreate} onClose={() => setOpenCreate(false)} guardId={guardId} onCreated={handleCreated} />

      {openShowId !== null && (
        <ShowShift open={openShowId !== null} onClose={() => setOpenShowId(null)} shiftId={openShowId as number} onUpdated={handleUpdated} onDeleted={handleDeleted} />
      )}

      {openEditId !== null && (
        <EditShift open={openEditId !== null} onClose={() => setOpenEditId(null)} shiftId={openEditId as number} onUpdated={handleUpdated} />
      )}

      {openDeleteId !== null && (
        <DeleteShift open={openDeleteId !== null} onClose={() => setOpenDeleteId(null)} shiftId={openDeleteId as number} onDeleted={handleDeleted} />
      )}
    </Dialog>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode; }) {
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
