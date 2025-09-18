"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressInput } from "@/components/ui/address-input";
import { toast } from "sonner";
import { createClient, type CreateClientPayload } from "@/lib/services/clients";
import { useModalCache } from "@/hooks/use-modal-cache";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { showCreatedToast } from "@/lib/toast-helpers";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

interface ClientFormData {
  clientType: "person" | "company";
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
    clientType: {
      label: getText("clients.form.fields.clientType", "Client Type"),
      person: getText("clients.form.clientType.person", "Person"),
      company: getText("clients.form.clientType.company", "Company"),
    },
    fields: {
      firstName: getText("clients.form.fields.firstName", "First name *"),
      lastName: getText("clients.form.fields.lastName", "Last name *"),
      companyName: getText("clients.form.fields.companyName", "Company name *"),
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
      sameAsMailing: getText("clients.form.buttons.sameAsMailing", "Same as mailing address"),
    },
    validation: {
      firstNameRequired: getText("clients.form.validation.firstNameRequired", "First name is required"),
      lastNameRequired: getText("clients.form.validation.lastNameRequired", "Last name is required"),
      companyNameRequired: getText("clients.form.validation.companyNameRequired", "Company name is required"),
      emailRequired: getText("clients.form.validation.emailRequired", "Email is required"),
    },
    success: getText("clients.form.success", "Client created"),
  };

  const [clientType, setClientType] = React.useState<"person" | "company">("person");
  const [firstName, setFirstName] = React.useState<string>("");
  const [lastName, setLastName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");
  const [address, setAddress] = React.useState<string>("");
  const [billingAddress, setBillingAddress] = React.useState<string>("");

  const [loading, setLoading] = React.useState<boolean>(false);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string | undefined>>({});
  const [generalError, setGeneralError] = React.useState<string>("");
  
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
        setClientType(cachedData.clientType ?? "person");
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
      (clientType !== "person" || firstName || lastName || email || phone || address || billingAddress)
    ) {
      saveToCache("create-client", {
        clientType,
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress,
      });
    }
  }, [clientType, firstName, lastName, email, phone, address, billingAddress, open, saveToCache]);

  function resetForm() {
    setClientType("person");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setBillingAddress("");
    setValidationErrors({});
    setGeneralError("");
    clearCache("create-client");
  }

  function handleClose() {
    if (clientType !== "person" || firstName || lastName || email || phone || address || billingAddress) {
      saveToCache("create-client", {
        clientType,
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

  function copyMainToBillingAddress() {
    setBillingAddress(address);
    toast.success("Main address copied to billing address");
  }

  function validateForm(): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (clientType === "person") {
      if (!firstName.trim()) {
        errors.firstName = "El nombre es requerido";
      }
      if (!lastName.trim()) {
        errors.lastName = "El apellido es requerido";
      }
    } else {
      if (!firstName.trim()) {
        errors.firstName = "El nombre de la empresa es requerido";
      }
    }

    if (!email.trim()) {
      errors.email = "El correo electrónico es requerido";
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errors.email = "Por favor ingresa un correo electrónico válido";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    
    // Limpiar errores previos
    setValidationErrors({});
    setGeneralError("");
    
    const { isValid, errors } = validateForm();
    
    if (!isValid) {
      setValidationErrors(errors);
      setGeneralError("Por favor completa todos los campos requeridos");
      return;
    }

    setLoading(true);

    try {
      const payload: CreateClientPayload = {
        first_name: firstName.trim(),
        last_name: clientType === "person" ? lastName.trim() : "",
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

      // Toast moderno verde para creación exitosa
      const clientName = `${firstName} ${lastName}`.trim() || email || "Cliente";
      showCreatedToast("Cliente", clientName);
      
      if (!mountedRef.current) return;

      // Limpiar errores y resetear form
      setValidationErrors({});
      setGeneralError("");
      clearCache("create-client");
      resetForm();

      if (onCreated) await onCreated();
      onClose();
    } catch (err: any) {
      console.error("Error creando cliente:", err);
      const server = err?.response?.data ?? err?.message ?? String(err);
      setGeneralError(typeof server === "object" ? JSON.stringify(server) : String(server));
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
              {/* Client Type Selector */}
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm">{FORM.clientType.label}</label>
                  <Select value={clientType} onValueChange={(value: "person" | "company") => setClientType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">{FORM.clientType.person}</SelectItem>
                      <SelectItem value="company">{FORM.clientType.company}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Name fields - conditional based on client type */}
              {clientType === "person" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm">{FORM.fields.firstName}</label>
                    <Input
                      name="firstName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        // Limpiar error cuando el usuario empieza a escribir
                        if (validationErrors.firstName) {
                          setValidationErrors(prev => ({ ...prev, firstName: undefined }));
                        }
                      }}
                      required
                      className={validationErrors.firstName ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {validationErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm">{FORM.fields.lastName}</label>
                    <Input
                      name="lastName"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        // Limpiar error cuando el usuario empieza a escribir
                        if (validationErrors.lastName) {
                          setValidationErrors(prev => ({ ...prev, lastName: undefined }));
                        }
                      }}
                      required
                      className={validationErrors.lastName ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {validationErrors.lastName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-sm">{FORM.fields.companyName}</label>
                    <Input
                      name="companyName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        // Limpiar error cuando el usuario empieza a escribir
                        if (validationErrors.firstName) {
                          setValidationErrors(prev => ({ ...prev, firstName: undefined }));
                        }
                      }}
                      required
                      className={validationErrors.firstName ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {validationErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{FORM.fields.email}</label>
                  <Input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Limpiar error cuando el usuario empieza a escribir
                      if (validationErrors.email) {
                        setValidationErrors(prev => ({ ...prev, email: undefined }));
                      }
                    }}
                    required
                    className={validationErrors.email ? "border-red-500 focus:border-red-500" : ""}
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm">{FORM.fields.phone}</label>
                  <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  label={FORM.fields.address}
                  placeholder={FORM.placeholders?.address}
                  name="address"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm">{FORM.fields.billingAddress}</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyMainToBillingAddress}
                    disabled={!address || address.trim() === ""}
                    className="text-xs px-2 py-1 h-6"
                  >
                    {FORM.buttons.sameAsMailing}
                  </Button>
                </div>
                <AddressInput
                  value={billingAddress}
                  onChange={setBillingAddress}
                  placeholder={FORM.placeholders?.billingAddress}
                  name="billingAddress"
                />
              </div>

              {/* Mensaje de error general */}
              {generalError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{generalError}</p>
                    </div>
                  </div>
                </div>
              )}

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
