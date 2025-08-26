// src/components/Users/DeleteUserDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { User } from "../types";
import { deleteUser } from "@/lib/services/users";
import { useI18n } from "@/i18n";

interface Props {
  user: User;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
}

export default function DeleteUserDialog({ user, onClose, onDeleted }: Props) {
  const { TEXT } = useI18n();

  function getText(path: string, fallback?: string, vars?: Record<string, string>) {
    const parts = path.split(".");
    let val: any = TEXT;
    for (const p of parts) {
      val = val?.[p];
      if (val == null) break;
    }
    let str = typeof val === "string" ? val : fallback ?? path;
    if (vars && typeof str === "string") {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      }
    }
    return String(str);
  }

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteUser(user.id);
      if (onDeleted) await onDeleted();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data) {
        if (typeof data === "string") setError(data);
        else if (data.detail) setError(String(data.detail));
        else setError(JSON.stringify(data));
      } else {
        // fallback localized message
        setError(getText("users.form.deleteError", "Error eliminando usuario"));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const label = (user.name ?? user.username ?? `#${user.id}`).toString();
  const title = getText("users.form.deleteTitle", "Eliminar Usuario");
  const confirmText = getText("users.form.deleteConfirm", "¿Seguro que quieres eliminar a {name}?", { name: label });
  const cancelLabel = getText("actions.cancel", "Cancelar");
  const deleteLabel = getText("users.form.buttons.delete", "Eliminar");
  const deletingLabel = getText("users.form.buttons.deleting", "Eliminando...");

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <p>{confirmText}</p>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? deletingLabel : deleteLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
