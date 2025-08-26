"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Guard } from "../types";
import { deleteGuard } from "@/lib/services/guard";
import { useI18n } from "@/i18n";

interface Props {
  guard: Guard;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
}

export default function DeleteGuardDialog({ guard, onClose, onDeleted }: Props) {
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
      await deleteGuard(guard.id);
      if (onDeleted) await onDeleted();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") setError(data);
        else if (data.detail) setError(String(data.detail));
        else setError(JSON.stringify(data));
      } else {
        setError(getText("guards.table.actionDelete") || "Error eliminando guardia");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const guardLabel = `${guard.firstName ?? ""} ${guard.lastName ?? ""}`.trim() || `#${guard.id}`;

  // Use a confirmation text that includes the guard name (prefer table.actionDeleteConfirm if present)
  const confirmTitle = getText("guards.table.actionDeleteConfirm", { name: guardLabel }) || getText("guards.table.actionDelete", { name: guardLabel });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmTitle}</DialogTitle>
        </DialogHeader>

        <p>
          {getText("common.notFoundDescription") /* if you want another message, swap this for a more specific key */}
        </p>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {getText("actions.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? getText("guards.form.buttons.deleting") || "Deleting..." : getText("guards.form.buttons.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
