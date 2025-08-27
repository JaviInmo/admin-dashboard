"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Guard } from "../types";
import { updateGuard, type UpdateGuardPayload } from "@/lib/services/guard";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  guard: Guard;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

export default function EditGuardDialog({ guard, open, onClose, onUpdated }: Props) {
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

  const [firstName, setFirstName] = React.useState<string>(guard.firstName ?? "");
  const [lastName, setLastName] = React.useState<string>(guard.lastName ?? "");
  const [email, setEmail] = React.useState<string>(guard.email ?? "");
  const [phone, setPhone] = React.useState<string>(guard.phone ?? "");
  const [ssn, setSsn] = React.useState<string>(guard.ssn ?? "");
  const [address, setAddress] = React.useState<string>(guard.address ?? "");
  const [birthdate, setBirthdate] = React.useState<string>(guard.birthdate ?? "");

  const initialShowSsn =
    (guard as any).ssn_visible === true ||
    (guard as any).ssnVisible === true ||
    (guard as any).is_ssn_visible === true ||
    false;

  const [showSsn, setShowSsn] = React.useState<boolean>(initialShowSsn);

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    setFirstName(guard.firstName ?? "");
    setLastName(guard.lastName ?? "");
    setEmail(guard.email ?? "");
    setPhone(guard.phone ?? "");
    setSsn(guard.ssn ?? "");
    setAddress(guard.address ?? "");
    setBirthdate(guard.birthdate ?? "");
    setError(null);

    const newInitial =
      (guard as any).ssn_visible === true ||
      (guard as any).ssnVisible === true ||
      (guard as any).is_ssn_visible === true ||
      false;
    setShowSsn(newInitial);
  }, [guard]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setError(getText("guards.form.validation.invalidEmail"));
      return;
    }
    if (!firstName.trim()) {
      setError(getText("guards.form.validation.firstNameRequired"));
      return;
    }
    if (!lastName.trim()) {
      setError(getText("guards.form.validation.lastNameRequired"));
      return;
    }

    setLoading(true);
    try {
      const basePayload: UpdateGuardPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      };

      if (phone.trim() !== "") (basePayload as any).phone = phone.trim();
      if (ssn.trim() !== "") (basePayload as any).ssn = ssn.trim();
      if (address.trim() !== "") (basePayload as any).address = address.trim();
      if (birthdate !== "") (basePayload as any).birth_date = birthdate;

      const payloadAny: any = { ...(basePayload as any) };
      payloadAny.ssn_visible = showSsn;
      payloadAny.is_ssn_visible = showSsn;

      if ("user" in payloadAny) {
        delete payloadAny.user;
      }

      await updateGuard(guard.id, payloadAny);
      toast.success(getText("guards.form.success") || getText("guards.form.editTitle") || "Guard updated");
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

  const isMissingGuard = !guard || Object.keys(guard).length === 0;
  const showSkeleton = isMissingGuard || loading;

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
          <DialogTitle>
            {getText("guards.form.editTitle")} — {guardLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {showSkeleton ? (
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
                  <Input
                    name="ssn"
                    type={showSsn ? "text" : "password"}
                    value={ssn}
                    onChange={(e) => setSsn(e.target.value)}
                    placeholder={showSsn ? "" : getText("guards.form.placeholders.ssnHidden") ?? "********"}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id={`toggle-ssn-${guard.id}`}
                      type="checkbox"
                      checked={showSsn}
                      onChange={() => setShowSsn((v) => !v)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor={`toggle-ssn-${guard.id}`} className="text-sm">
                      {getText("Show") ?? "Mostrar SSN"}
                    </label>
                  </div>
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

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  {getText("actions.cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? getText("guards.form.buttons.saving") || "Saving..." : getText("guards.form.buttons.save")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
