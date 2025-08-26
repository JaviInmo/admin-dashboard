"use client";

import * as React from "react";
import { updateClient, type AppClient, type UpdateClientPayload } from "@/lib/services/clients";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModalCache } from "@/hooks/use-modal-cache";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

type Props = {
  client: AppClient;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
};

interface EditClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  billingAddress: string;
  isActive: boolean;
}

export default function EditClientDialog({ client, open, onClose, onUpdated }: Props) {
  const { TEXT, lang } = useI18n();

  const FORM = TEXT?.clients?.form ?? {};
  // fallback for updated success message (use created if updated not present)
  const UPDATED_SUCCESS =
    (FORM as any)?.updatedSuccess ??
    (FORM as any)?.updateSuccess ??
    (FORM as any)?.success ??
    (lang === "es" ? "Cliente actualizado" : "Client updated");

  const [firstName, setFirstName] = React.useState(client.firstName ?? "");
  const [lastName, setLastName] = React.useState(client.lastName ?? "");
  const [email, setEmail] = React.useState(client.email ?? "");
  const [phone, setPhone] = React.useState(client.phone ?? "");
  const [address, setAddress] = React.useState(client.address ?? "");
  const [billingAddress, setBillingAddress] = React.useState(client.billingAddress ?? "");
  const [isActive, setIsActive] = React.useState<boolean>(client.isActive ?? false);
  const [loading, setLoading] = React.useState(false);
  const mountedRef = React.useRef(true);
  const { saveToCache, getFromCache, clearCache } = useModalCache<EditClientFormData>();

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cargar datos del caché cuando se abre el modal o cambia el cliente
  React.useEffect(() => {
    const cacheKey = `edit-client-${client.id}`;
    if (open) {
      const cachedData = getFromCache(cacheKey);
      if (cachedData) {
        setFirstName(cachedData.firstName ?? "");
        setLastName(cachedData.lastName ?? "");
        setEmail(cachedData.email ?? "");
        setPhone(cachedData.phone ?? "");
        setAddress(cachedData.address ?? "");
        setBillingAddress(cachedData.billingAddress ?? "");
        setIsActive(typeof cachedData.isActive === "boolean" ? cachedData.isActive : client.isActive ?? false);
      } else {
        // Si no hay caché, usar datos del cliente
        setFirstName(client.firstName ?? "");
        setLastName(client.lastName ?? "");
        setEmail(client.email ?? "");
        setPhone(client.phone ?? "");
        setAddress(client.address ?? "");
        setBillingAddress(client.billingAddress ?? "");
        setIsActive(client.isActive ?? false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, open]);

  // Guardar en caché cuando cambian los valores
  React.useEffect(() => {
    if (open) {
      const cacheKey = `edit-client-${client.id}`;
      saveToCache(cacheKey, {
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress,
        isActive,
      });
    }
  }, [firstName, lastName, email, phone, address, billingAddress, isActive, client.id, open, saveToCache]);

  function handleClose() {
    // Guardar datos antes de cerrar (para conservar cambios)
    const cacheKey = `edit-client-${client.id}`;
    saveToCache(cacheKey, {
      firstName,
      lastName,
      email,
      phone,
      address,
      billingAddress,
      isActive,
    });
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: UpdateClientPayload = {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        billing_address: billingAddress || undefined,
        // enviamos is_active (snake_case) tal como espera el servicio
        is_active: isActive,
        // No enviamos 'balance' aquí: permanece intacto en el servidor.
      };

      await updateClient(client.id, payload);

      // Limpiar caché después de actualizar exitosamente
      const cacheKey = `edit-client-${client.id}`;
      clearCache(cacheKey);

      toast.success(UPDATED_SUCCESS);
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error actualizando cliente:", err);
      const server = err?.response?.data ?? err?.message ?? String(err);
      toast.error(typeof server === "object" ? JSON.stringify(server) : String(server));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>{(FORM as any)?.editTitle ?? (TEXT?.clients?.title ?? (lang === "es" ? "Editar Cliente" : "Edit Client"))}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">{(FORM as any)?.fields?.firstName ?? (lang === "es" ? "Nombre" : "First name")}</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">{(FORM as any)?.fields?.lastName ?? (lang === "es" ? "Apellido" : "Last name")}</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">{(FORM as any)?.fields?.email ?? (lang === "es" ? "Correo" : "Email")}</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">{(FORM as any)?.fields?.phone ?? (lang === "es" ? "Teléfono" : "Phone")}</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">{(FORM as any)?.fields?.address ?? (lang === "es" ? "Dirección" : "Address")}</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={(FORM as any)?.placeholders?.address ?? (lang === "es" ? "Dirección física del cliente" : "Client's physical address")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">{(FORM as any)?.fields?.billingAddress ?? (lang === "es" ? "Dirección de facturación" : "Billing address")}</label>
                <Input
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder={(FORM as any)?.placeholders?.billingAddress ?? (lang === "es" ? "Dirección para envío de facturas" : "Address used for invoicing")}
                />
              </div>
            </div>

            {/* Campo para marcar activo / inactivo */}
            <div className="flex items-center gap-3 mt-2">
              <input
                id={`client-active-${client.id}`}
                type="checkbox"
                checked={isActive}
                onChange={() => setIsActive((v) => !v)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor={`client-active-${client.id}`} className="text-sm">
                {(FORM as any)?.fields?.isActive ?? (lang === "es" ? "Activo" : "Active")}
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                {(FORM as any)?.buttons?.cancel ?? (lang === "es" ? "Cancelar" : "Cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? ( (FORM as any)?.buttons?.saving ?? (lang === "es" ? "Guardando..." : "Saving...") ) : ( (FORM as any)?.buttons?.save ?? (lang === "es" ? "Guardar" : "Save") )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
