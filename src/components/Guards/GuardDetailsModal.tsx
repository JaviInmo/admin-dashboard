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
import { Mail, Phone, MapPin, Calendar, User, CreditCard, Copy } from "lucide-react";
import type { Guard } from "./types";
import { ClickableEmail } from "@/components/ui/clickable-email";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

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

  // bandera que viene del backend (solo para inicializar)
  const anyGuard = guard as any;
  const ssnVisibleFromBackend =
    anyGuard.ssn_visible === true ||
    anyGuard.ssnVisible === true ||
    anyGuard.is_ssn_visible === true ||
    false;

  // Estado local para mostrar/ocultar SSN en la UI (inicializado desde backend flag)
  const [showSsn, setShowSsn] = React.useState<boolean>(ssnVisibleFromBackend);

  // Sincronizar cuando cambia el guard (por ejemplo abrir modal para otro guard)
  React.useEffect(() => {
    setShowSsn(
      (guard as any).ssn_visible === true ||
      (guard as any).ssnVisible === true ||
      (guard as any).is_ssn_visible === true ||
      false
    );
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

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 w-full">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xl font-semibold shadow">
                {initials}
              </div>
              <div>
                <DialogTitle className="text-lg leading-5">
                  {fullName}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    ID: {guard.id}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {TEXT?.guards?.table?.title ? TEXT?.guards?.table?.title.replace(" List", "") : "Guardia"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
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
                  guard.email ? (
                    <ClickableEmail email={guard.email} />
                  ) : (
                    "-"
                  )
                }
              />
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label={TEXT?.guards?.table?.headers?.phone ?? "Teléfono"}
                value={
                  guard.phone ? (
                    <a
                      href={`https://wa.me/${encodeURIComponent(normalizePhoneForWhatsapp(guard.phone))}`}
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{showSsn ? guard.ssn : (TEXT?.guards?.table?.ssnHidden ?? "******")}</span>

                        {/* botón copiar solo si está visible */}
                        {showSsn && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(guard.ssn)}
                            title={TEXT?.actions?.copy ?? "Copy"}
                            className="inline-flex items-center rounded px-2 py-1 text-sm hover:bg-muted/30 ml-2"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Checkbox igual que en EditGuardDialog */}
                      <div className="mt-2 sm:mt-0 flex items-center gap-2">
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
