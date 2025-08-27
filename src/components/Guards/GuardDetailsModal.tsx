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
import { Mail, Phone, MapPin, Calendar, User, CreditCard } from "lucide-react";
import type { Guard } from "./types";
import { ClickableEmail } from "@/components/ui/clickable-email";

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

  // Normaliza número para WhatsApp
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

  // Verificar si el SSN es visible
  const anyGuard = guard as any;
  const ssnVisible =
    anyGuard.ssn_visible === true ||
    anyGuard.ssnVisible === true ||
    anyGuard.is_ssn_visible === true ||
    false;

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
                    Guardia
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
                label="Nombre"
                value={guard.firstName || "-"}
              />
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Apellido"
                value={guard.lastName || "-"}
              />
              <InfoItem
                icon={<Mail className="h-4 w-4" />}
                label="Correo"
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
                label="Teléfono"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                icon={<CreditCard className="h-4 w-4" />}
                label="DNI/SSN"
                value={
                  guard.ssn ? (
                    ssnVisible ? guard.ssn : "******"
                  ) : (
                    "-"
                  )
                }
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Fecha de Nacimiento"
                value={formatDateMaybe(guard.birthdate)}
              />
            </div>

            {guard.address && (
              <InfoItem
                icon={<MapPin className="h-4 w-4" />}
                label="Dirección"
                value={guard.address}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose}>
              Cerrar
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
