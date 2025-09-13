"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

import type { Weapon } from "@/components/Weapons/types";
import { deleteWeapon } from "@/lib/services/weapons";

interface Props {
  weapon: Weapon;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
}

export default function DeleteWeaponDialog({ weapon, onClose, onDeleted }: Props) {
  const { TEXT } = useI18n();

  function getText(path: string, vars?: Record<string, string>, fallback?: string) {
    const parts = path.split(".");
    let val: any = TEXT;
    for (const p of parts) {
      val = val?.[p];
      if (val == null) break;
    }
    let str = typeof val === "string" ? val : fallback ?? path;
    if (vars) {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      }
    }
    return str;
  }

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Prioriza mostrar el modelo; si no existe, usa serialNumber; si tampoco existe, usa id.
  const weaponLabel = `${(weapon?.model ?? weapon?.serialNumber ?? "")}`.trim() || `#${weapon?.id ?? "?"}`;

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteWeapon(weapon.id);
      const deletedMsg = getText("weapons.messages.deleted", undefined, "Arma eliminada");
      if (onDeleted) await onDeleted();
      toast.success(deletedMsg);
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") setError(data);
        else if (data.detail) setError(String(data.detail));
        else setError(JSON.stringify(data));
      } else {
        setError(getText("weapons.errors.deleteFail", undefined, "Error eliminando arma"));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isMissingWeapon = !weapon || Object.keys(weapon).length === 0;
  const showSkeleton = isMissingWeapon || loading;

  const title = getText("weapons.delete.title", undefined, "Eliminar Arma");
  const confirmTemplate = getText(
    "weapons.delete.confirm",
    { name: weaponLabel },
    `¿Estás seguro que quieres eliminar ${weaponLabel}?`
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{showSkeleton ? <Skeleton className="h-6 w-3/5 rounded" /> : title}</DialogTitle>
        </DialogHeader>

        {showSkeleton ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-10 w-1/3 rounded mt-4" />
            <div className="flex justify-end gap-2 mt-4">
              <Skeleton className="h-10 w-24 rounded" />
              <Skeleton className="h-10 w-36 rounded" />
            </div>
          </div>
        ) : (
          <>
            <p>{confirmTemplate}</p>

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                {getText("actions.cancel", undefined, "Cancelar")}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? getText("actions.deleting", undefined, "Eliminando...") : getText("actions.delete", undefined, "Eliminar")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
