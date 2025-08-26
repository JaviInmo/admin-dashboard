"use client";

import * as React from "react";
import { deleteClient, type AppClient } from "@/lib/services/clients";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

type Props = {
  client: AppClient;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => Promise<void> | void;
};

export default function DeleteClientDialog({ client, open, onClose, onDeleted }: Props) {
  const { TEXT, lang } = useI18n();

  // Try to read delete-specific strings from TEXT; fallback to reasonable defaults
  const FORM = TEXT?.clients?.form ?? ({} as any);
  const DELETE = (FORM as any).delete ?? {
    title: lang === "es" ? "Eliminar Cliente" : "Delete Client",
    confirm: lang === "es"
      ? "¿Estás seguro que quieres eliminar {name}?"
      : "Are you sure you want to delete {name}?",
    note: lang === "es" ? "Esta acción no se puede deshacer." : "This action cannot be undone.",
    cancel: (FORM as any)?.buttons?.cancel ?? (lang === "es" ? "Cancelar" : "Cancel"),
    button: (FORM as any)?.buttons?.delete ?? (lang === "es" ? "Eliminar" : "Delete"),
    deleting: lang === "es" ? "Eliminando..." : "Deleting...",
    success: lang === "es" ? "Cliente eliminado exitosamente" : "Client deleted successfully",
    error: lang === "es" ? "Error borrando cliente" : "Error deleting client",
  };

  const [loading, setLoading] = React.useState(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function getDisplayName() {
    const name =
      client.username ??
      [client.firstName ?? "", client.lastName ?? ""].map((s) => s.trim()).join(" ").trim();
    return name || String(client.id);
  }

  function format(template: string) {
    return template.replace("{name}", getDisplayName());
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteClient(client.id);
      toast.success(DELETE.success);
      if (onDeleted) await onDeleted();
      onClose();
    } catch (err: any) {
      console.error("Error borrando cliente:", err);
      const server = err?.response?.data ?? err?.message ?? String(err);
      toast.error(typeof server === "object" ? JSON.stringify(server) : (server ?? DELETE.error));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>{DELETE.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <p>
            {format(DELETE.confirm)}{" "}
            <strong>{getDisplayName()}</strong>
          </p>
          <p className="text-sm text-muted-foreground">{DELETE.note}</p>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {DELETE.cancel}
            </Button>
            <Button onClick={handleDelete} disabled={loading} variant="destructive">
              {loading ? DELETE.deleting : DELETE.button}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
