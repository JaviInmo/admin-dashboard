"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient, type CreateClientPayload } from "@/lib/services/clients";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function CreateClientDialog({ open, onClose, onCreated }: Props) {
  const [username, setUsername] = React.useState<string>("");
  const [firstName, setFirstName] = React.useState<string>("");
  const [lastName, setLastName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");

  const [loading, setLoading] = React.useState<boolean>(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function resetForm() {
    setUsername("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
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
        balance: "0",
      };

      // Medida defensiva: nunca enviar key "user"
      if ((payload as any).user) {
        delete (payload as any).user;
      }

      await createClient(payload);

      toast.success("Cliente creado");
      if (!mountedRef.current) return;
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
    <Dialog open={open} onOpenChange={onClose}>
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

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear"}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
