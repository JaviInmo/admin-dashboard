// src/components/Weapons/CreateWeaponDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

import type { Guard } from "@/components/Guards/types";
import type { Weapon } from "@/components/Weapons/Types";
import { getGuard, listGuards } from "@/lib/services/guard";
import { createWeapon } from "@/lib/services/weapons";

type Props = {
  open: boolean;
  onClose: () => void;
  guardId?: number;
  onCreated?: (weapon: Weapon) => void | Promise<void>;
};

function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function extractItems<T>(maybe: any): T[] {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe as T[];
  if (Array.isArray(maybe.results)) return maybe.results as T[];
  if (Array.isArray(maybe.items)) return maybe.items as T[];
  if (Array.isArray(maybe.data?.results)) return maybe.data.results as T[];
  return [];
}

export default function CreateWeaponDialog({ open, onClose, guardId, onCreated }: Props) {
  const { TEXT } = useI18n();

  const [selectedGuard, setSelectedGuard] = React.useState<Guard | null>(null);
  const [guardQuery, setGuardQuery] = React.useState<string>("");
  const debouncedGuardQuery = useDebouncedValue(guardQuery, 300);
  const [guardResults, setGuardResults] = React.useState<Guard[]>([]);
  const [guardsLoading, setGuardsLoading] = React.useState(false);
  const [guardDropdownOpen, setGuardDropdownOpen] = React.useState(false);

  const [serialNumber, setSerialNumber] = React.useState<string>("");
  const [model, setModel] = React.useState<string>("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSelectedGuard(null);
      setGuardQuery("");
      setGuardResults([]);
      setGuardsLoading(false);
      setGuardDropdownOpen(false);
      setSerialNumber("");
      setModel("");
      setError(null);
    } else if (guardId) {
      let mounted = true;
      (async () => {
        try {
          const g = await getGuard(guardId);
          if (!mounted) return;
          setSelectedGuard(g);
          setGuardQuery(`${g.firstName} ${g.lastName} (${g.email ?? ""})`);
        } catch (err) {
          console.error("prefill guard failed", err);
        }
      })();
      return () => {
        mounted = false;
      };
    }
  }, [open, guardId]);

  React.useEffect(() => {
    let mounted = true;
    const q = (debouncedGuardQuery ?? "").trim();
    if (q === "") {
      setGuardResults([]);
      return;
    }
    setGuardsLoading(true);
    (async () => {
      try {
        const res = await listGuards(1, q, 10);
        if (!mounted) return;
        const items = extractItems<Guard>(res);
        setGuardResults(items);
        setGuardDropdownOpen(true);
      } catch (err) {
        console.error("listGuards error", err);
        setGuardResults([]);
      } finally {
        if (mounted) setGuardsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debouncedGuardQuery]);

  const guardLabel = (g?: Guard | null) => {
    if (!g) return "";
    return `${g.firstName} ${g.lastName} (${g.email ?? ""})`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setError(null);

    if (!selectedGuard) {
      setError((TEXT as any)?.weapons?.errors?.missingGuard ?? "Selecciona un guard");
      toast.error((TEXT as any)?.weapons?.errors?.missingGuard ?? "Guard required");
      return;
    }
    if (!serialNumber.trim()) {
      setError((TEXT as any)?.weapons?.errors?.missingSerial ?? "Serial required");
      toast.error((TEXT as any)?.weapons?.errors?.missingSerial ?? "Serial required");
      return;
    }
    if (!model.trim()) {
      setError((TEXT as any)?.weapons?.errors?.missingModel ?? "Model required");
      toast.error((TEXT as any)?.weapons?.errors?.missingModel ?? "Model required");
      return;
    }

    setLoading(true);
    try {
      const created = await createWeapon({
        guard: selectedGuard.id,
        serialNumber: serialNumber.trim(),
        model: model.trim(),
      });
      toast.success((TEXT as any)?.weapons?.messages?.created ?? "Weapon created");
      if (onCreated) await onCreated(created);
      onClose();
    } catch (err: any) {
      console.error("createWeapon error:", err);
      const data = err?.response?.data;
      const message = data?.detail ?? data ?? String(err?.message ?? err);
      setError(typeof message === "string" ? message : JSON.stringify(message));
      toast.error(message ?? "Error creando weapon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{(TEXT as any)?.weapons?.create?.title ?? "Crear Weapon"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="relative">
            <label className="text-sm text-muted-foreground block mb-1">Guard</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2"
              value={selectedGuard ? guardLabel(selectedGuard) : guardQuery}
              onChange={(e) => {
                if (selectedGuard) setSelectedGuard(null);
                setGuardQuery(e.target.value);
              }}
              onFocus={() => {
                if (guardResults.length > 0) setGuardDropdownOpen(true);
              }}
              placeholder={(TEXT as any)?.guards?.table?.searchPlaceholder ?? "Buscar guard por nombre o email..."}
              aria-label="Buscar guard"
            />
            {selectedGuard && (
              <button
                type="button"
                className="absolute right-2 top-2 text-xs text-muted-foreground"
                onClick={() => {
                  setSelectedGuard(null);
                  setGuardQuery("");
                }}
              >
                Clear
              </button>
            )}

            {guardDropdownOpen && (guardResults.length > 0 || guardsLoading) && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-56 overflow-auto">
                {guardsLoading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
                {!guardsLoading && guardResults.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matches.</div>}
                {!guardsLoading &&
                  guardResults.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/10"
                      onClick={() => {
                        setSelectedGuard(g);
                        setGuardQuery(`${g.firstName} ${g.lastName} (${g.email ?? ""})`);
                        setGuardDropdownOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <div className="text-sm truncate">{`${g.firstName} ${g.lastName}`}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{g.email}</div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Serial Number</label>
            <Input name="serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Model</label>
            <Input name="model" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>
                {(TEXT as any)?.actions?.close ?? "Close"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? ((TEXT as any)?.actions?.saving ?? "Saving...") : ((TEXT as any)?.actions?.create ?? "Create")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
