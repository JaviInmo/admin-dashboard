"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { updateService } from "@/lib/services/services";
import type { UpdateServicePayload } from "@/lib/services/services";
import type { Service } from "../types";
import { useI18n } from "@/i18n";

// guards / properties services + types
import type { Guard } from "@/components/Guards/types";
import { getGuard, listGuards } from "@/lib/services/guard";
import type { AppProperty } from "@/lib/services/properties";
import { getProperty, listProperties } from "@/lib/services/properties";

interface EditServiceDialogProps {
  service: Service;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
}

export default function EditServiceDialog({ service, open, onClose, onUpdated }: EditServiceDialogProps) {
  const { TEXT } = useI18n();
  const qc = useQueryClient();

  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(service.name ?? "");
  const [description, setDescription] = React.useState(service.description ?? "");
  // guard/property selection as ids
  const [guardId, setGuardId] = React.useState<number | null>(service.guard ?? null);
  const [guardInput, setGuardInput] = React.useState<string>("");
  const [guardSelectedLabel, setGuardSelectedLabel] = React.useState<string>("");

  const [propertyId, setPropertyId] = React.useState<number | null>(service.assignedProperty ?? null);
  const [propertyInput, setPropertyInput] = React.useState<string>("");
  const [propertySelectedLabel, setPropertySelectedLabel] = React.useState<string>("");

  const [guardSearchTerm, setGuardSearchTerm] = React.useState<string>("");
  const [propertySearchTerm, setPropertySearchTerm] = React.useState<string>("");

  const [rate, setRate] = React.useState<string>(service.rate ?? "");
  const [monthlyBudget, setMonthlyBudget] = React.useState<string>(service.monthlyBudget ?? "");
  const [isActive, setIsActive] = React.useState<boolean>(service.isActive ?? true);

  // sync when service changes
  React.useEffect(() => {
    setName(service.name ?? "");
    setDescription(service.description ?? "");
    setGuardId(service.guard ?? null);
    setGuardInput("");
    setGuardSelectedLabel(service.guardName ?? "");
    setPropertyId(service.assignedProperty ?? null);
    setPropertyInput("");
    setPropertySelectedLabel(service.propertyName ?? "");
    setRate(service.rate ?? "");
    setMonthlyBudget(service.monthlyBudget ?? "");
    setIsActive(service.isActive ?? true);
  }, [service]);

  // fetch label for existing guardId (if no label provided)
  const guardDetailQuery = useQuery<Guard, Error>({
    queryKey: ["guard-detail", guardId],
    queryFn: async () => {
      if (guardId == null) throw new Error("no guard id");
      return await getGuard(guardId);
    },
    enabled: guardId != null && (!guardSelectedLabel || guardSelectedLabel.trim() === ""),
  });

  React.useEffect(() => {
    if (guardDetailQuery.data) {
      const g = guardDetailQuery.data;
      const lbl = `${g.firstName} ${g.lastName}${g.email ? ` — ${g.email}` : ""}`;
      setGuardSelectedLabel(lbl);
      // only set input if it's empty (so we don't clobber user typing)
      if (!guardInput) setGuardInput(lbl);
    }
  }, [guardDetailQuery.data]);

  // fetch label for existing propertyId
  const propDetailQuery = useQuery<AppProperty, Error>({
    queryKey: ["property-detail", propertyId],
    queryFn: async () => {
      if (propertyId == null) throw new Error("no property id");
      return await getProperty(propertyId);
    },
    enabled: propertyId != null && (!propertySelectedLabel || propertySelectedLabel.trim() === ""),
  });

  React.useEffect(() => {
    if (propDetailQuery.data) {
      const p = propDetailQuery.data;
      const lbl = `${p.name ?? p.alias ?? "Property #" + p.id} — ${p.address}`;
      setPropertySelectedLabel(lbl);
      if (!propertyInput) setPropertyInput(lbl);
    }
  }, [propDetailQuery.data]);

  // debounce input -> search term
  React.useEffect(() => {
    const t = setTimeout(() => setGuardSearchTerm(guardInput.trim()), 300);
    return () => clearTimeout(t);
  }, [guardInput]);

  React.useEffect(() => {
    const t = setTimeout(() => setPropertySearchTerm(propertyInput.trim()), 300);
    return () => clearTimeout(t);
  }, [propertyInput]);

  // guard suggestions
  const guardsQuery = useQuery<Guard[], Error>({
    queryKey: ["guards-suggest", guardSearchTerm],
    queryFn: async () => {
      const res = await listGuards(1, guardSearchTerm || undefined, 10, "user__first_name");
      const anyRes = res as any;
      if (Array.isArray(anyRes)) return anyRes as Guard[];
      return (anyRes.results ?? anyRes.data ?? anyRes.items ?? []) as Guard[];
    },
    enabled: guardSearchTerm.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // property suggestions
  const propsQuery = useQuery<AppProperty[], Error>({
    queryKey: ["properties-suggest", propertySearchTerm],
    queryFn: async () => {
      const res = await listProperties(1, propertySearchTerm || undefined, 10, "name");
      const anyRes = res as any;
      if (Array.isArray(anyRes)) return anyRes as AppProperty[];
      return (anyRes.results ?? anyRes.data ?? anyRes.items ?? []) as AppProperty[];
    },
    enabled: propertySearchTerm.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const clearGuardSelection = () => {
    setGuardId(null);
    setGuardSelectedLabel("");
    setGuardInput("");
  };

  const clearPropertySelection = () => {
    setPropertyId(null);
    setPropertySelectedLabel("");
    setPropertyInput("");
  };

  const resetForm = () => {
    setName(service.name ?? "");
    setDescription(service.description ?? "");
    setGuardId(service.guard ?? null);
    setGuardInput("");
    setGuardSelectedLabel(service.guardName ?? "");
    setPropertyId(service.assignedProperty ?? null);
    setPropertyInput("");
    setPropertySelectedLabel(service.propertyName ?? "");
    setRate(service.rate ?? "");
    setMonthlyBudget(service.monthlyBudget ?? "");
    setIsActive(service.isActive ?? true);
  };

  const handleUpdate = async () => {
    if (!name || name.trim().length === 0) {
      toast.error(TEXT?.services?.errors?.nameRequired ?? "Name required");
      return;
    }

    const payload: UpdateServicePayload = {
      name: name.trim(),
      description: description.trim() === "" ? undefined : description.trim(),
      guard: guardId ?? undefined,
      assigned_property: propertyId ?? undefined,
      rate: rate === "" ? undefined : rate,
      monthly_budget: monthlyBudget === "" ? undefined : monthlyBudget,
      is_active: isActive,
    };

    try {
      setLoading(true);
      await updateService(service.id, payload);
      toast.success(TEXT?.services?.messages?.updated ?? "Updated");
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "services" });
      onClose();
      if (onUpdated) {
        const maybe = onUpdated();
        if (maybe && typeof (maybe as any).then === "function") await maybe;
      }
    } catch (err: any) {
      toast.error(err?.message ?? TEXT?.services?.errors?.updateFailed ?? "Update failed");
    } finally {
      setLoading(false);
    }
  };

  // label render helpers
  const guardLabel = (g: Guard) => `${g.firstName} ${g.lastName}${g.email ? ` — ${g.email}` : ""}`;
  const propertyLabel = (p: AppProperty) => `${p.name ?? p.alias ?? "Property #" + p.id} — ${p.address}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TEXT?.services?.edit?.title ?? "Edit Service"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <label className="text-sm">{TEXT?.services?.fields?.name ?? "Name"}</label>
          <Input value={name} onChange={(e) => setName(e.currentTarget.value)} />

          <label className="text-sm">{TEXT?.services?.fields?.description ?? "Description"}</label>
          <Textarea value={description ?? ""} onChange={(e) => setDescription(e.currentTarget.value)} />

          <div className="grid grid-cols-2 gap-3">
            {/* Guard combobox */}
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.guard ?? "Guard"}</label>
              <div className="relative">
                <Input
                  value={guardInput || guardSelectedLabel}
                  onChange={(e) => {
                    setGuardInput(e.currentTarget.value);
                    setGuardId(null);
                    setGuardSelectedLabel("");
                  }}
                  placeholder={TEXT?.services?.placeholders?.guard ?? "Type to search guards"}
                  aria-autocomplete="list"
                />

                {(Array.isArray(guardsQuery.data) && guardsQuery.data.length > 0 && guardInput.trim().length > 0) && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
                    {guardsQuery.isFetching && <div className="p-2 text-sm text-muted-foreground">{TEXT?.common?.loading ?? "Loading..."}</div>}
                    {guardsQuery.data.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent/50"
                        onClick={() => {
                          setGuardId(g.id);
                          const lbl = guardLabel(g);
                          setGuardSelectedLabel(lbl);
                          setGuardInput(lbl);
                        }}
                      >
                        {guardLabel(g)}
                      </button>
                    ))}
                  </div>
                )}

                {guardId !== null && (
                  <button type="button" aria-label="Clear guard" onClick={clearGuardSelection} className="absolute right-2 top-2 text-sm opacity-70">✕</button>
                )}
              </div>
            </div>

            {/* Property combobox */}
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.assignedProperty ?? "Property"}</label>
              <div className="relative">
                <Input
                  value={propertyInput || propertySelectedLabel}
                  onChange={(e) => {
                    setPropertyInput(e.currentTarget.value);
                    setPropertyId(null);
                    setPropertySelectedLabel("");
                  }}
                  placeholder={TEXT?.services?.placeholders?.property ?? "Type to search properties"}
                  aria-autocomplete="list"
                />

                {(Array.isArray(propsQuery.data) && propsQuery.data.length > 0 && propertyInput.trim().length > 0) && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
                    {propsQuery.isFetching && <div className="p-2 text-sm text-muted-foreground">{TEXT?.common?.loading ?? "Loading..."}</div>}
                    {propsQuery.data.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent/50"
                        onClick={() => {
                          setPropertyId(p.id);
                          const lbl = propertyLabel(p);
                          setPropertySelectedLabel(lbl);
                          setPropertyInput(lbl);
                        }}
                      >
                        {propertyLabel(p)}
                      </button>
                    ))}
                  </div>
                )}

                {propertyId !== null && (
                  <button type="button" aria-label="Clear property" onClick={clearPropertySelection} className="absolute right-2 top-2 text-sm opacity-70">✕</button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.rate ?? "Rate / hr"}</label>
              <Input value={rate ?? ""} onChange={(e) => setRate(e.currentTarget.value)} />
            </div>
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.monthlyBudget ?? "Monthly budget"}</label>
              <Input value={monthlyBudget ?? ""} onChange={(e) => setMonthlyBudget(e.currentTarget.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
            <span>{TEXT?.services?.fields?.isActive ?? "Is active"}</span>
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { resetForm(); onClose(); }} disabled={loading}>{TEXT?.actions?.cancel ?? "Cancel"}</Button>
            <Button onClick={handleUpdate} disabled={loading}>{loading ? (TEXT?.actions?.saving ?? "Saving...") : (TEXT?.actions?.save ?? "Save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
