// src/components/Weapons/Show/Show.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { getWeapon } from "@/lib/services/weapons";
import type { Weapon } from "@/components/Weapons/types";
import EditWeaponDialog from "@/components/Weapons/Edit/Edit";
import DeleteWeaponDialog from "@/components/Weapons/Delete/Delete";
import { toast } from "sonner";

interface Props {
  id: number | null | undefined;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

export default function ShowWeapon({ id, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();

  const [weapon, setWeapon] = React.useState<Weapon | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [showEdit, setShowEdit] = React.useState(false);
  const [/* showDelete */, setShowDelete] = React.useState(false);

  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (!id && id !== 0) {
      setWeapon(null);
      setError("Invalid id");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const w = await getWeapon(Number(id));
        if (!mounted) return;
        setWeapon(w);
      } catch (err: any) {
        console.error("getWeapon error:", err);
        const data = err?.response?.data ?? err?.message ?? String(err);
        setError(typeof data === "object" ? JSON.stringify(data) : String(data));
        toast.error(typeof data === "string" ? data : "Error fetching weapon");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, id]);

  const handleAfterUpdate = async () => {
    // refetch item and call parent callback
    try {
      if (id !== undefined && id !== null) {
        setLoading(true);
        const w = await getWeapon(Number(id));
        if (mountedRef.current) setWeapon(w);
      }
      if (onUpdated) await onUpdated();
    } catch (err) {
      console.error("after update refresh failed", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleAfterDelete = async () => {
    // parent may want to refresh list; close modal
    if (onUpdated) await onUpdated();
    onClose();
  };

  const weaponLabel = weapon ? `${weapon.serialNumber} (${weapon.model})` : `#${id ?? "?"}`;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle>
                {(TEXT as any)?.weapons?.show?.title ?? "Weapon"} — {weapon ? weaponLabel : <Skeleton className="inline-block w-32 h-5" />}
              </DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEdit(true)}
                  disabled={loading || !weapon}
                >
                  {(TEXT as any)?.actions?.edit ?? "Edit"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  disabled={loading || !weapon}
                >
                  {(TEXT as any)?.actions?.delete ?? "Delete"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 p-2 mt-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : !weapon ? (
              <div className="text-sm text-muted-foreground">{(TEXT as any)?.common?.notFoundDescription ?? "No weapon found."}</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Serial Number</div>
                  <div className="text-sm font-medium">{weapon.serialNumber}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Model</div>
                  <div className="text-sm font-medium">{weapon.model}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Guard</div>
                  <div className="text-sm font-medium">
                    {weapon.guardDetails
                      ? (weapon.guardDetails.name ?? `${weapon.guardDetails.first_name ?? ""} ${weapon.guardDetails.last_name ?? ""}`).trim() ||
                        `#${weapon.guard}`
                      : `#${weapon.guard}`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Created At</div>
                    <div className="text-sm">{weapon.createdAt ? new Date(weapon.createdAt).toLocaleString() : "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Updated At</div>
                    <div className="text-sm">{weapon.updatedAt ? new Date(weapon.updatedAt).toLocaleString() : "-"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {weapon && (
        <EditWeaponDialog
          weapon={weapon}
          open={showEdit}
          onClose={() => setShowEdit(false)}
          onUpdated={async () => {
            setShowEdit(false);
            await handleAfterUpdate();
          }}
        />
      )}

      {/* Delete dialog */}
      {weapon && (
        <DeleteWeaponDialog
          weapon={weapon}
          onClose={() => setShowDelete(false)}
          onDeleted={async () => {
            setShowDelete(false);
            await handleAfterDelete();
          }}
        />
      )}
    </>
  );
}
