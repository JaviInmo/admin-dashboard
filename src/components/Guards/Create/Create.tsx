"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createGuard, type CreateGuardPayload } from "@/lib/services/guard";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function CreateGuardDialog({ open, onClose, onCreated }: Props) {
  const { TEXT } = useI18n();

  function getText(path: string, vars?: Record<string, string>) {
    const parts = path.split(".");
    let val: any = TEXT;
    for (const p of parts) {
      val = val?.[p];
      if (val == null) break;
    }
    let str = typeof val === "string" ? val : path;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      }
    }
    return str;
  }

  const [firstName, setFirstName] = React.useState<string>("");
  const [lastName, setLastName] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");
  const [ssn, setSsn] = React.useState<string>("");
  const [address, setAddress] = React.useState<string>("");
  const [birthdate, setBirthdate] = React.useState<string>(""); // ISO date yyyy-mm-dd

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
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSsn("");
    setAddress("");
    setBirthdate("");
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      if (!firstName.trim()) {
        toast.error(getText("guards.form.validation.firstNameRequired"));
        setLoading(false);
        return;
      }
      if (!lastName.trim()) {
        toast.error(getText("guards.form.validation.lastNameRequired"));
        setLoading(false);
        return;
      }
      if (!email.trim()) {
        toast.error(getText("guards.form.validation.invalidEmail") || getText("users.form.validation.emailRequired"));
        setLoading(false);
        return;
      }

      const payload: CreateGuardPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() !== "" ? phone.trim() : undefined,
        ssn: ssn.trim() !== "" ? ssn.trim() : undefined,
        address: address.trim() !== "" ? address.trim() : undefined,
        birth_date: birthdate !== "" ? birthdate : undefined,
      };

      await createGuard(payload);

      const successMsg =
        (getText("guards.form.createSuccess") as string) ||
        (getText("guards.form.success") as string) ||
        `${getText("guards.form.createTitle")} ${getText("actions.save")}`;
      toast.success(successMsg || "Guard created");

      if (!mountedRef.current) return;
      if (onCreated) await onCreated();
      onClose();
    } catch (err: any) {
      console.error("Error creando guardia:", err);
      const server = err?.response?.data ?? err?.message ?? String(err);
      toast.error(typeof server === "object" ? JSON.stringify(server) : String(server));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const FieldSkeleton = ({ rows = 1 }: { rows?: number }) => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-2/5 rounded" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getText("guards.form.createTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {/* Si está enviando el formulario mostramos skeleton para que el usuario vea feedback */}
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

              <div className="grid grid-cols-2 gap-2">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>

              <FieldSkeleton rows={1} />

              <div className="flex justify-end gap-2 mt-3">
                <Skeleton className="h-10 w-24 rounded" />
                <Skeleton className="h-10 w-36 rounded" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{getText("guards.form.fields.firstName")} *</label>
                  <Input name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm">{getText("guards.form.fields.lastName")} *</label>
                  <Input name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{getText("guards.form.fields.email")} *</label>
                  <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm">{getText("guards.form.fields.phone")}</label>
                  <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{getText("guards.form.fields.ssn")}</label>
                  <Input name="ssn" value={ssn} onChange={(e) => setSsn(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm">{getText("guards.form.fields.birthdate")}</label>
                  <Input name="birthdate" type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm">{getText("guards.form.fields.address")}</label>
                <Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  {getText("actions.cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? getText("guards.form.buttons.creating") || "Creating..." : getText("guards.form.buttons.create")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
