"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient, type CreateClientPayload } from "@/lib/services/clients";
import { useModalCache } from "@/hooks/use-modal-cache";
import { useI18n } from "@/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

interface ClientFormData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  billingAddress: string;
}

export default function CreateClientDialog({ open, onClose, onCreated }: Props) {
  const { TEXT } = useI18n();

  // Texto del formulario (aseguramos que existan las claves en los archivos de texto)
  const FORM = TEXT?.clients?.form ?? {
    createTitle: TEXT?.clients?.title ?? "Create Client",
    fields: {
      username: "Username",
      firstName: "First name *",
      lastName: "Last name *",
      email: "Email *",
      phone: "Phone",
      address: "Address",
      billingAddress: "Billing address",
    },
    placeholders: {
      address: "Client's primary address",
      billingAddress: "Address used for invoicing",
    },
    buttons: {
      cancel: "Cancel",
      create: "Create",
      creating: "Creating...",
    },
    validation: {
      firstNameRequired: "First name is required",
      lastNameRequired: "Last name is required",
      emailRequired: "Email is required",
    },
    success: "Client created",
  };

  const [username, setUsername] = React.useState<string>("");
  const [firstName, setFirstName] = React.useState<string>("");
  const [lastName, setLastName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");
  const [address, setAddress] = React.useState<string>("");
  const [billingAddress, setBillingAddress] = React.useState<string>("");

  const [loading, setLoading] = React.useState<boolean>(false);
  const mountedRef = React.useRef(true);
  const { saveToCache, getFromCache, clearCache } = useModalCache<ClientFormData>();

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cargar datos del caché cuando se abre el modal
  React.useEffect(() => {
    if (open) {
      const cachedData = getFromCache("create-client");
      if (cachedData) {
        setUsername(cachedData.username ?? "");
        setFirstName(cachedData.firstName ?? "");
        setLastName(cachedData.lastName ?? "");
        setEmail(cachedData.email ?? "");
        setPhone(cachedData.phone ?? "");
        setAddress(cachedData.address ?? "");
        setBillingAddress(cachedData.billingAddress ?? "");
      }
    }
  }, [open, getFromCache]);

  // Guardar en caché cuando cambian los valores
  React.useEffect(() => {
    if (
      open &&
      (username || firstName || lastName || email || phone || address || billingAddress)
    ) {
      saveToCache("create-client", {
        username,
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress,
      });
    }
  }, [username, firstName, lastName, email, phone, address, billingAddress, open, saveToCache]);

  function resetForm() {
    setUsername("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setBillingAddress("");
    clearCache("create-client");
  }

  function handleClose() {
    // Guardar datos antes de cerrar (para conservar cambios)
    if (username || firstName || lastName || email || phone || address || billingAddress) {
      saveToCache("create-client", {
        username,
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress,
      });
    }
    onClose();
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas con mensajes i18n
      if (!firstName.trim()) {
        toast.error(FORM.validation.firstNameRequired);
        setLoading(false);
        return;
      }
      if (!lastName.trim()) {
        toast.error(FORM.validation.lastNameRequired);
        setLoading(false);
        return;
      }
      if (!email.trim()) {
        toast.error(FORM.validation.emailRequired);
        setLoading(false);
        return;
      }

      const payload: CreateClientPayload = {
        username: username.trim() !== "" ? username.trim() : undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() !== "" ? phone.trim() : undefined,
        address: address.trim() !== "" ? address.trim() : undefined,
        billing_address: billingAddress.trim() !== "" ? billingAddress.trim() : undefined,
        balance: "0",
      };

      // Medida defensiva: nunca enviar key "user"
      if ((payload as any).user) {
        delete (payload as any).user;
      }

      await createClient(payload);

      toast.success(FORM.success);
      if (!mountedRef.current) return;

      // Limpiar caché después de crear exitosamente
      clearCache("create-client");
      resetForm();

      if (onCreated) await onCreated();
      onClose();
    } catch (err: any) {
      console.error("Error creando cliente:", err);
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
          <DialogTitle>{FORM.createTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">{FORM.fields.username}</label>
                <Input name="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              {/* Balance oculto en creación */}
              <div />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">{FORM.fields.firstName}</label>
                <Input
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm">{FORM.fields.lastName}</label>
                <Input
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">{FORM.fields.email}</label>
                <Input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm">{FORM.fields.phone}</label>
                <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">{FORM.fields.address}</label>
                <Input
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={FORM.placeholders?.address}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">{FORM.fields.billingAddress}</label>
                <Input
                  name="billingAddress"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder={FORM.placeholders?.billingAddress}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                {FORM.buttons.cancel}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? FORM.buttons.creating : FORM.buttons.create}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
