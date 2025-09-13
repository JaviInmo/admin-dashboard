"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { deleteService, softDeleteService } from "@/lib/services/services";
import type { Service } from "../types";
import { useI18n } from "@/i18n";

interface DeleteServiceDialogProps {
  service: Service;
  onClose: () => void;
  onDeleted?: () => Promise<void> | void;
  open?: boolean;
  soft?: boolean;
  compact?: boolean;
}

export default function DeleteServiceDialog({
  service,
  onClose,
  onDeleted,
  open = true,
  soft = false,
  compact = false,
}: DeleteServiceDialogProps) {
  const { TEXT } = useI18n();
  const qc = useQueryClient();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      if (soft) {
        await softDeleteService(service.id);
      } else {
        await deleteService(service.id);
      }
      toast.success(TEXT?.services?.messages?.deleted ?? "Deleted");
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "services" });
      onClose();
      if (onDeleted) {
        const maybe = onDeleted();
        if (maybe && typeof (maybe as any).then === "function") await maybe;
      }
    } catch (err: any) {
      toast.error(err?.message ?? TEXT?.services?.errors?.deleteFailed ?? "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const formattedConfirm = React.useMemo(() => {
    const nameSafe = service?.name ?? "";
    const defaultConfirm = `¿Seguro que querés eliminar el servicio "${nameSafe}"?`;
    const tpl = TEXT?.services?.delete?.confirm ?? defaultConfirm;
    if (/\{\{\s*name\s*\}\}|\{\s*name\s*\}|\%name\%|:name/.test(tpl)) {
      return tpl
        .replace(/\{\{\s*name\s*\}\}/g, nameSafe)
        .replace(/\{\s*name\s*\}/g, nameSafe)
        .replace(/\%name\%/g, nameSafe)
        .replace(/:name/g, nameSafe);
    }
    if (/\bname\b/.test(tpl)) {
      return tpl.replace(/\bname\b/g, nameSafe);
    }
    return tpl;
  }, [TEXT, service]);

  const dialogClass = compact ? "max-w-2xl w-full" : "max-w-4xl w-full";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className={compact ? "text-base" : undefined}>{TEXT?.services?.delete?.title ?? "Delete service"}</DialogTitle>
        </DialogHeader>

        <div className="py-3">
          <p className="text-sm">
            {formattedConfirm}
          </p>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {TEXT?.actions?.cancel ?? "Cancel"}
            </Button>
            <Button className="bg-red-600" onClick={handleDelete} disabled={loading}>
              {loading ? (TEXT?.actions?.deleting ?? "Deleting...") : (TEXT?.actions?.delete ?? "Delete")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
