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
import { Mail, Phone, MapPin, Calendar, User, DollarSign, Building, Clock } from "lucide-react";
import type { AppProperty } from "@/lib/services/properties";
import { ClickableAddress } from "@/components/ui/clickable-address";

type PropertyDetailsModalProps = {
  property: AppProperty & { ownerName?: string; typesOfServiceStr?: string };
  open: boolean;
  onClose: () => void;
};

export default function PropertyDetailsModal({
  property,
  open,
  onClose,
}: PropertyDetailsModalProps) {
  const initials = React.useMemo(() => {
    const name = property.name || property.alias || "";
    if (name.length >= 2) {
      return name.slice(0, 2).toUpperCase();
    }
    return "P";
  }, [property]);

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

  // Obtener datos del propietario
  const ownerDetails = (property as any).ownerDetails ?? {};
  const ownerPhone = ownerDetails.phone ?? ownerDetails.user_phone ?? "";
  const ownerEmail = ownerDetails.email ?? ownerDetails.user_email ?? "";

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

  return (
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
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-semibold shadow">
                {initials}
              </div>
              <div>
                <DialogTitle className="text-lg leading-5">
                  {property.name || property.alias || `Propiedad #${property.id}`}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  {property.alias && property.name !== property.alias && (
                    <div className="text-sm text-muted-foreground">
                      Alias: {property.alias}
                    </div>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    Propiedad
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div className="mt-1 space-y-4">
            {/* Información básica de la propiedad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                icon={<Building className="h-4 w-4" />}
                label="Nombre"
                value={property.name || "-"}
              />
              <InfoItem
                icon={<Building className="h-4 w-4" />}
                label="Alias/Nick"
                value={property.alias || "-"}
              />
              <InfoItem
                icon={<DollarSign className="h-4 w-4" />}
                label="Tarifa Mensual"
                value={
                  property.monthlyRate != null && property.monthlyRate !== ""
                    ? `$${property.monthlyRate}`
                    : "-"
                }
              />
              <InfoItem
                icon={<Clock className="h-4 w-4" />}
                label="Horas Totales"
                value={property.totalHours ?? "-"}
              />
            </div>

            {/* Dirección en sección completa */}
            {property.address && (
              <InfoItem
                icon={<MapPin className="h-4 w-4" />}
                label="Dirección"
                value={<ClickableAddress address={property.address} />}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Fecha de Inicio"
                value={formatDateMaybe((property as any).contractStartDate ?? (property as any).startDate)}
              />
            </div>

            {/* Tipos de servicio */}
            {(property as any).typesOfServiceStr && (
              <InfoItem
                icon={<Building className="h-4 w-4" />}
                label="Tipos de Servicio"
                value={(property as any).typesOfServiceStr}
              />
            )}

            {/* Información del propietario */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Información del Propietario</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Propietario"
                  value={(property as any).ownerName || `#${(property as any).ownerId ?? (property as any).owner ?? property.id}`}
                />
                {ownerEmail && (
                  <InfoItem
                    icon={<Mail className="h-4 w-4" />}
                    label="Email del Propietario"
                    value={
                      <a
                        href={`mailto:${ownerEmail}`}
                        className="text-blue-600 hover:underline"
                        title="Enviar email"
                      >
                        {ownerEmail}
                      </a>
                    }
                  />
                )}
                {ownerPhone && (
                  <InfoItem
                    icon={<Phone className="h-4 w-4" />}
                    label="Teléfono del Propietario"
                    value={
                      <a
                        href={`https://wa.me/${encodeURIComponent(normalizePhoneForWhatsapp(ownerPhone))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        title="Abrir en WhatsApp"
                      >
                        {ownerPhone}
                      </a>
                    }
                  />
                )}
              </div>
            </div>

            {/* Fechas del sistema */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Creado"
                value={formatDateMaybe((property as any).created_at ?? (property as any).createdAt)}
              />
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Actualizado"
                value={formatDateMaybe((property as any).updated_at ?? (property as any).updatedAt)}
              />
            </div>
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
