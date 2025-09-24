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
import { Mail, Phone, MapPin, Calendar, User, DollarSign, Check, X } from "lucide-react";
import type { Client } from "./types";
import { ClickableEmail } from "@/components/ui/clickable-email";
import { useI18n } from "@/i18n/index";

type ClientDetailsModalProps = {
  client: Client;
  open: boolean;
  onClose: () => void;
};

export default function ClientDetailsModal({
  client,
  open,
  onClose,
}: ClientDetailsModalProps) {
  const { TEXT } = useI18n();
  const fullName = React.useMemo(() => {
    const first = client.firstName || "";
    const last = client.lastName || "";
    const name = `${first} ${last}`.trim();
    return name || client.username || `${TEXT?.clients?.clientDetails?.labels?.clientId ?? "Client #"}${client.id}`;
  }, [client, TEXT]);

  const initials = React.useMemo(() => {
    const first = client.firstName || "";
    const last = client.lastName || "";
    if (first && last) {
      return (first[0] + last[0]).toUpperCase();
    }
    if (first) return first.slice(0, 2).toUpperCase();
    if (last) return last.slice(0, 2).toUpperCase();
    if (client.username) return client.username.slice(0, 2).toUpperCase();
    return "C";
  }, [client]);

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

  // Verificar el estado del cliente
  const status = (client as any).status ?? "active";
  const isActive = typeof status === "string" ? status.toLowerCase() === "active" : Boolean(status);

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
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xl font-semibold shadow">
                {initials}
              </div>
              <div>
                <DialogTitle className="text-lg leading-5">
                  {fullName}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  {client.username && (
                    <div className="text-sm text-muted-foreground">
                      @{client.username}
                    </div>
                  )}
                  <Badge
                    variant={isActive ? "secondary" : "outline"}
                    className="text-xs flex items-center gap-1"
                  >
                    {isActive ? (
                      <>
                        <Check className="h-3 w-3" />
                        {TEXT?.clients?.clientDetails?.status?.active ?? "Active"}
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3" />
                        {TEXT?.clients?.clientDetails?.status?.inactive ?? "Inactive"}
                      </>
                    )}
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
                label={TEXT?.clients?.clientDetails?.labels?.firstName ?? "First Name"}
                value={client.firstName || "-"}
              />
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label={TEXT?.clients?.clientDetails?.labels?.lastName ?? "Last Name"}
                value={client.lastName || "-"}
              />
              <InfoItem
                icon={<Mail className="h-4 w-4" />}
                label={TEXT?.clients?.clientDetails?.labels?.email ?? "Email"}
                value={
                  client.email ? (
                    <ClickableEmail email={client.email} />
                  ) : (
                    "-"
                  )
                }
              />
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label={TEXT?.clients?.clientDetails?.labels?.phone ?? "Phone"}
                value={
                  client.phone ? (
                    <a
                      href={`https://wa.me/${encodeURIComponent(normalizePhoneForWhatsapp(client.phone))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      title={TEXT?.clients?.clientDetails?.tooltips?.openInWhatsapp ?? "Open in WhatsApp"}
                    >
                      {client.phone}
                    </a>
                  ) : (
                    "-"
                  )
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {client.balance !== undefined && (
                <InfoItem
                  icon={<DollarSign className="h-4 w-4" />}
                  label={TEXT?.clients?.clientDetails?.labels?.balance ?? "Balance"}
                  value={`$${(client.balance || 0).toFixed(2)}`}
                />
              )}
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label={TEXT?.clients?.clientDetails?.labels?.createdAt ?? "Created Date"}
                value={formatDateMaybe(client.created_at)}
              />
            </div>

            {client.updated_at && (
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label={TEXT?.clients?.clientDetails?.labels?.updatedAt ?? "Last Updated"}
                value={formatDateMaybe(client.updated_at)}
              />
            )}

            {/* Sección de direcciones - completa abajo */}
            {(client.address || client.billingAddress) && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">{TEXT?.clients?.clientDetails?.sections?.addresses ?? "Addresses"}</h4>
                <div className="space-y-3">
                  {client.address && (
                    <InfoItem
                      icon={<MapPin className="h-4 w-4" />}
                      label={TEXT?.clients?.clientDetails?.labels?.primaryAddress ?? "Primary Address"}
                      value={client.address}
                    />
                  )}
                  {client.billingAddress && (
                    <InfoItem
                      icon={<MapPin className="h-4 w-4" />}
                      label={TEXT?.clients?.clientDetails?.labels?.billingAddress ?? "Billing Address"}
                      value={client.billingAddress}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={onClose}>
              {TEXT?.clients?.clientDetails?.buttons?.close ?? "Close"}
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
