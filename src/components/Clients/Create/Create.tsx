"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient, type CreateClientPayload } from "@/lib/services/clients";
import { useModalCache } from "@/hooks/use-modal-cache";

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
      const cachedData = getFromCache('create-client');
      if (cachedData) {
        setUsername(cachedData.username);
        setFirstName(cachedData.firstName);
        setLastName(cachedData.lastName);
        setEmail(cachedData.email);
        setPhone(cachedData.phone);
        setAddress(cachedData.address);
        setBillingAddress(cachedData.billingAddress);
      }
    }
  }, [open, getFromCache]);

  // Guardar en caché cuando cambian los valores
  React.useEffect(() => {
    if (open && (username || firstName || lastName || email || phone || address || billingAddress)) {
      saveToCache('create-client', {
        username,
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress
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
    clearCache('create-client');
  }

  function handleClose() {
    // Guardar datos antes de cerrar (para conservar cambios)
    if (username || firstName || lastName || email || phone || address || billingAddress) {
      saveToCache('create-client', {
        username,
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress
      });
    }
    onClose();
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (!firstName.trim()) {
        toast.error("Nombre es requerido");
        setLoading(false);
        return;
      }
      if (!lastName.trim()) {
        toast.error("Apellido es requerido");
        setLoading(false);
        return;
      }
      if (!email.trim()) {
        toast.error("Email es requerido");
        setLoading(false);
        return;
      }

      // Construimos payload usando undefined para omitir campos opcionales.
      // Balance siempre 0 según lo solicitado.
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

      toast.success("Cliente creado");
      if (!mountedRef.current) return;
      
      // Limpiar caché después de crear exitosamente
      clearCache('create-client');
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
          <DialogTitle>Crear Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">Usuario</label>
                <Input name="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              {/* Balance oculto en creación */}
              <div />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">Nombre *</label>
                <Input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm">Apellido *</label>
                <Input name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">Correo *</label>
                <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm">Teléfono</label>
                <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">Dirección</label>
                <Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección principal del cliente" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">Dirección de facturación</label>
                <Input name="billingAddress" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Dirección para envío de facturas" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear"}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
