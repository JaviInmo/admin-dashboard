"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient, type CreateClientPayload } from "@/lib/services/clients";
import { useModalCache } from "@/hooks/use-modal-cache";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";

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

  function getText(path: string, fallback?: string) {
    const parts = path.split(".");
    let val: any = TEXT as any;
    for (const p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (typeof val === "string") return val;
    return fallback ?? path;
  }

  const FORM = {
    createTitle: getText("clients.form.createTitle", getText("clients.title", "Create Client")),
    fields: {
      username: getText("clients.form.fields.username", "Username"),
      firstName: getText("clients.form.fields.firstName", "First name *"),
      lastName: getText("clients.form.fields.lastName", "Last name *"),
      email: getText("clients.form.fields.email", "Email *"),
      phone: getText("clients.form.fields.phone", "Phone"),
      address: getText("clients.form.fields.address", "Address"),
      billingAddress: getText("clients.form.fields.billingAddress", "Billing address"),
    },
    placeholders: {
      address: getText("clients.form.placeholders.address", "Client's primary address"),
      billingAddress: getText("clients.form.placeholders.billingAddress", "Address used for invoicing"),
    },
    buttons: {
      cancel: getText("clients.form.buttons.cancel", getText("actions.cancel", "Cancel")),
      create: getText("clients.form.buttons.create", "Create"),
      creating: getText("clients.form.buttons.creating", "Creating..."),
    },
    validation: {
      firstNameRequired: getText("clients.form.validation.firstNameRequired", "First name is required"),
      lastNameRequired: getText("clients.form.validation.lastNameRequired", "Last name is required"),
      emailRequired: getText("clients.form.validation.emailRequired", "Email is required"),
    },
    success: getText("clients.form.success", "Client created"),
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

      if ((payload as any).user) {
        delete (payload as any).user;
      }

      await createClient(payload);

      toast.success(FORM.success);
      if (!mountedRef.current) return;

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

  const FieldSkeleton = ({ rows = 1 }: { rows?: number }) => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/3 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded" />
      ))}
    </div>
  );

  const ButtonSkeleton = () => <Skeleton className="h-10 w-36 rounded" />;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>{FORM.createTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {loading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <FieldSkeleton />
                <div />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <FieldSkeleton />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <FieldSkeleton />
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <ButtonSkeleton />
                <ButtonSkeleton />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{FORM.fields.username}</label>
                  <Input name="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
