"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
/* import { Skeleton } from "@/components/ui/skeleton"; */

import type { Guard } from "@/components/Guards/types";
import type { Weapon } from "@/components/Weapons/types";
import { getGuard, listGuards } from "@/lib/services/guard";
import { createWeapon } from "@/lib/services/weapons";

type Props = {
  open: boolean;
  onClose: () => void;
  guardId?: number;
  lockGuard?: boolean;
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

export default function CreateWeaponDialog({ open, onClose, guardId, lockGuard = false, onCreated }: Props) {
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

  // cuando el modal se abre, si recibimos guardId y lockGuard=true, prefilleamos y bloqueamos
  React.useEffect(() => {
    let mounted = true;
    if (!open) {
      setSelectedGuard(null);
      setGuardQuery("");
      setGuardResults([]);
      setGuardsLoading(false);
      setGuardDropdownOpen(false);
      setSerialNumber("");
      setModel("");
      setError(null);
      return;
    }

    if (guardId) {
      (async () => {
        try {
          const g = await getGuard(guardId);
          if (!mounted) return;
          setSelectedGuard(g);
          setGuardQuery(`${g.firstName} ${g.lastName} (${g.email ?? ""})`);
          if (!lockGuard) setGuardDropdownOpen(true);
        } catch (err) {
          console.error("prefill guard failed", err);
        }
      })();
    }

    return () => {
      mounted = false;
    };
  }, [open, guardId, lockGuard]);

  // búsqueda de guards (solo si no está bloqueado)
  React.useEffect(() => {
    if (lockGuard) return;

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
  }, [debouncedGuardQuery, lockGuard]);

  const guardLabel = (g?: Guard | null) => {
    if (!g) return "";
    return `${g.firstName} ${g.lastName} (${g.email ?? ""})`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setError(null);

    const tMissingGuard = getText("weapons.errors.missingGuard", undefined, "Selecciona un guard");
    const tMissingSerial = getText("weapons.errors.missingSerial", undefined, "Número de serie requerido");
    const tMissingModel = getText("weapons.errors.missingModel", undefined, "Modelo requerido");
    const successCreated = getText("weapons.messages.created", undefined, "Arma creada");
    const createFail = getText("weapons.errors.createFail", undefined, "Error creando arma");

    if (!selectedGuard) {
      setError(tMissingGuard);
      toast.error(tMissingGuard);
      return;
    }
    if (!serialNumber.trim()) {
      setError(tMissingSerial);
      toast.error(tMissingSerial);
      return;
    }
    if (!model.trim()) {
      setError(tMissingModel);
      toast.error(tMissingModel);
      return;
    }

    setLoading(true);
    try {
      const created = await createWeapon({
        guard: selectedGuard.id,
        serialNumber: serialNumber.trim(),
        model: model.trim(),
      });
      toast.success(successCreated);
      if (onCreated) await onCreated(created);
      onClose();
    } catch (err: any) {
      console.error("createWeapon error:", err);
      const data = err?.response?.data;
      const message = data?.detail ?? data ?? String(err?.message ?? err);
      const messageStr = typeof message === "string" ? message : JSON.stringify(message);
      setError(messageStr);
      toast.error(messageStr ?? createFail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getText("weapons.create.title", undefined, getText("weapons.create.title", undefined, "Crear Arma"))}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="relative">
            <label className="text-sm text-muted-foreground block mb-1">
              {getText("weapons.form.fields.guard", undefined, getText("guards.fields.name", undefined, "Guard"))}
            </label>

            <input
              type="text"
              className={`w-full rounded border px-3 py-2 ${lockGuard ? "bg-gray-100 cursor-not-allowed" : ""}`}
              value={selectedGuard ? guardLabel(selectedGuard) : guardQuery}
              onChange={(e) => {
                if (lockGuard) return;
                if (selectedGuard) setSelectedGuard(null);
                setGuardQuery(e.target.value);
              }}
              onFocus={() => {
                if (lockGuard) return;
                if (guardResults.length > 0) setGuardDropdownOpen(true);
              }}
              placeholder={getText("guards.table.searchPlaceholder", undefined, "Buscar guard por nombre o email...")}
              aria-label={getText("weapons.form.fields.guard", undefined, "Guard")}
              readOnly={lockGuard}
            />

            {!lockGuard && selectedGuard && (
              <button
                type="button"
                className="absolute right-2 top-2 text-xs text-muted-foreground"
                onClick={() => {
                  setSelectedGuard(null);
                  setGuardQuery("");
                }}
              >
                {getText("actions.reset", undefined, "Clear")}
              </button>
            )}

            {!lockGuard && guardDropdownOpen && (guardResults.length > 0 || guardsLoading) && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-56 overflow-auto">
                {guardsLoading && <div className="p-2 text-xs text-muted-foreground">{getText("table.loading", undefined, "Buscando...")}</div>}
                {!guardsLoading && guardResults.length === 0 && <div className="p-2 text-xs text-muted-foreground">{getText("table.noResults", undefined, "No matches.")}</div>}
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
            <label className="text-sm text-muted-foreground block mb-1">{getText("weapons.form.fields.serialNumber", undefined, "Número de serie")}</label>
            <Input name="serial" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder={getText("weapons.form.placeholders.serialNumber", undefined, "")} />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">{getText("weapons.form.fields.model", undefined, "Modelo")}</label>
            <Input name="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder={getText("weapons.form.placeholders.model", undefined, "")} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>
                {getText("actions.close", undefined, "Cerrar")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? getText("actions.saving", undefined, "Guardando...") : getText("actions.create", undefined, "Crear")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
