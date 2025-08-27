"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppProperty } from "@/lib/services/properties";
import { deleteProperty } from "@/lib/services/properties";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

interface Props {
  property: AppProperty;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
}

export default function DeletePropertyDialog({ property, open, onClose, onDeleted }: Props) {
  const { TEXT } = useI18n();

  const FORM = TEXT.properties?.form ?? {};
  const BUTTONS = FORM.buttons ?? {};
  const DELETE_TXT = FORM.delete ?? {};

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      await deleteProperty(property.id);
      toast.success(DELETE_TXT.success ?? "");
      if (onDeleted) await onDeleted();
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      let msg: string | null = null;
      if (data) {
        if (typeof data === "string") msg = data;
        else if (data.detail) msg = String(data.detail);
        else msg = JSON.stringify(data);
      } else {
        msg = DELETE_TXT.error ?? "";
      }
      setError(msg);
      toast.error(msg ?? "");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const label = property.name ? `${property.name}${property.address ? ` (${property.address})` : ""}` : `${property.address ?? ""} (#${property.id})`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{DELETE_TXT.title ?? ""}</DialogTitle>
        </DialogHeader>

        {/* Si está borrando, mostrar skeleton */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        ) : (
          <p>
            {(DELETE_TXT.confirm ?? "").replace("{name}", label)}
          </p>
        )}

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <DialogFooter>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              {BUTTONS.cancel ?? ""}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? (DELETE_TXT.deleting ?? "") : (DELETE_TXT.button ?? "")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
