"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";

import type { Weapon } from "@/components/Weapons/types";
import { updateWeapon, WEAPONS_KEY } from "@/lib/services/weapons";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  weapon: Weapon;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

export default function EditWeaponDialog({ weapon, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();
  const queryClient = useQueryClient();

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

  const [serialNumber, setSerialNumber] = React.useState<string>(weapon.serialNumber ?? "");
  const [model, setModel] = React.useState<string>(weapon.model ?? "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    setSerialNumber(weapon.serialNumber ?? "");
    setModel(weapon.model ?? "");
    setError(null);
  }, [weapon]);

  const isMissingWeapon = !weapon || Object.keys(weapon).length === 0;
  const showSkeleton = isMissingWeapon || loading;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!serialNumber.trim()) {
      setError(getText("weapons.form.validation.missingSerial") ?? "Serial required");
      return;
    }
    if (!model.trim()) {
      setError(getText("weapons.form.validation.missingModel") ?? "Model required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        serialNumber: serialNumber.trim(),
        model: model.trim(),
      };
      await updateWeapon(weapon.id, payload);

      // Sólo invalidar las queries "by_guard" para forzar refetch del listado por guard.
      // Evitamos mutar manualmente todas las queries bajo WEAPONS_KEY.
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === WEAPONS_KEY &&
          query.queryKey[1] === "by_guard",
      });

      toast.success(getText("weapons.form.success") ?? "Weapon updated");
      if (!mountedRef.current) return;
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error updating weapon:", err);
      const data = err?.response?.data ?? err?.message ?? String(err);
      const message = typeof data === "object" ? JSON.stringify(data) : String(data);
      setError(message);
      toast.error(message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };
/* 
  const weaponLabel = `${weapon?.serialNumber ?? ""}`.trim() || `#${weapon?.id ?? "?"}`; */

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

  const rawTitle = getText("weapons.form.editTitle");
  const modalTitleText = typeof rawTitle === "string" && rawTitle.includes("—")
    ? rawTitle.replace(/\s*—\s*\d+$/, "").trim()
    : rawTitle;
  const titleToShow = modalTitleText && modalTitleText !== "weapons.form.editTitle"
    ? modalTitleText
    : "Editar Detalles del Arma";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titleToShow}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {showSkeleton ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <FieldSkeleton />
                <FieldSkeleton />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Skeleton className="h-10 w-24 rounded" />
                <Skeleton className="h-10 w-36 rounded" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">Serial Number *</label>
                  <Input name="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm">Model *</label>
                  <Input name="model" value={model} onChange={(e) => setModel(e.target.value)} required />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  {getText("actions.cancel") ?? "Cancel"}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Aplicando..." : "Aplicar"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
