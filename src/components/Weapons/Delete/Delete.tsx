// src/components/Weapons/DeleteWeaponDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";

import type { Weapon } from "@/components/Weapons/Types";
import { deleteWeapon } from "@/lib/services/weapons";

interface Props {
  weapon: Weapon;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
}

export default function DeleteWeaponDialog({ weapon, onClose, onDeleted }: Props) {
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

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteWeapon(weapon.id);
      if (onDeleted) await onDeleted();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") setError(data);
        else if (data.detail) setError(String(data.detail));
        else setError(JSON.stringify(data));
      } else {
        setError(getText("weapons.table.actionDelete") || "Error eliminando weapon");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const weaponLabel = `${weapon?.serialNumber ?? ""}`.trim() || `#${weapon?.id ?? "?"}`;

  const isMissingWeapon = !weapon || Object.keys(weapon).length === 0;
  const showSkeleton = isMissingWeapon || loading;

  const confirmTitle = getText("weapons.table.actionDeleteConfirm", { name: weaponLabel }) || getText("weapons.table.actionDelete", { name: weaponLabel });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{showSkeleton ? <Skeleton className="h-6 w-3/5 rounded" /> : confirmTitle}</DialogTitle>
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
            <p>{getText("common.notFoundDescription")}</p>

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={onClose} disabled={loading}>
                {getText("actions.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? getText("weapons.form.buttons.deleting") || "Deleting..." : getText("weapons.form.buttons.delete") || "Delete"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
