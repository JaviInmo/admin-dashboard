"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Guard } from "../types";
import { updateGuard, type UpdateGuardPayload } from "@/lib/services/guard";

interface Props {
  guard: Guard;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

export default function EditGuardDialog({ guard, open, onClose, onUpdated }: Props) {
  const [firstName, setFirstName] = React.useState<string>(guard.firstName ?? "");
  const [lastName, setLastName] = React.useState<string>(guard.lastName ?? "");
  const [email, setEmail] = React.useState<string>(guard.email ?? "");
  const [phone, setPhone] = React.useState<string>(guard.phone ?? "");
  const [ssn, setSsn] = React.useState<string>(guard.ssn ?? "");
  const [address, setAddress] = React.useState<string>(guard.address ?? "");
  const [birthdate, setBirthdate] = React.useState<string>(guard.birthdate ?? "");

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // if guard prop changes, update local state
  React.useEffect(() => {
    setFirstName(guard.firstName ?? "");
    setLastName(guard.lastName ?? "");
    setEmail(guard.email ?? "");
    setPhone(guard.phone ?? "");
    setSsn(guard.ssn ?? "");
    setAddress(guard.address ?? "");
    setBirthdate(guard.birthdate ?? "");
    setError(null);
  }, [guard]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setError("Correo inválido");
      return;
    }
    if (!firstName.trim()) {
      setError("Nombre es requerido");
      return;
    }
    if (!lastName.trim()) {
      setError("Apellido es requerido");
      return;
    }

    setLoading(true);
    try {
      // Construimos payload tipado como UpdateGuardPayload y omitimos campos vacíos
      const payload: UpdateGuardPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      };

      if (phone.trim() !== "") payload.phone = phone.trim();
      if (ssn.trim() !== "") payload.ssn = ssn.trim();
      if (address.trim() !== "") payload.address = address.trim();
      if (birthdate !== "") payload.birth_date = birthdate;

      // Remover `user` defensivamente si alguien lo hubiese agregado por error
      if ("user" in (payload as any)) {
        delete (payload as any).user;
      }

      await updateGuard(guard.id, payload);
      toast.success("Guardia actualizado");
      if (!mountedRef.current) return;
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error actualizando guardia:", err);
      const data = err?.response?.data ?? err?.message ?? String(err);
      const message = typeof data === "object" ? JSON.stringify(data) : String(data);
      setError(message);
      toast.error(message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const guardLabel = `${guard.firstName ?? ""} ${guard.lastName ?? ""}`.trim() || `#${guard.id}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Guardia — {guardLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
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
                <label className="block text-sm">Email *</label>
                <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm">Teléfono</label>
                <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">DNI / SSN</label>
                <Input name="ssn" value={ssn} onChange={(e) => setSsn(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">Fecha de Nacimiento</label>
                <Input name="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm">Dirección</label>
              <Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
