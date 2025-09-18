"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { createService } from "@/lib/services/services";
import type { CreateServicePayload } from "@/lib/services/services";
import { useI18n } from "@/i18n";
import type { Guard } from "@/components/Guards/types";
import { listGuards } from "@/lib/services/guard";
import type { AppProperty } from "@/lib/services/properties";
import { listProperties } from "@/lib/services/properties";

interface CreateServiceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
  initialGuardId?: number | null;
  initialGuardLabel?: string | null;

  // NUEVO: initial property prefill
  initialPropertyId?: number | null;
  initialPropertyLabel?: string | null;

  compact?: boolean;
}

export default function CreateServiceDialog({
  open,
  onClose,
  onCreated,
  initialGuardId = null,
  initialGuardLabel = null,
  initialPropertyId = null,
  initialPropertyLabel = null,
  compact = false,
}: CreateServiceDialogProps) {
  const { TEXT } = useI18n();
  const qc = useQueryClient();

  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [guardInput, setGuardInput] = React.useState("");
  const [guardId, setGuardId] = React.useState<number | null>(null);
  const [guardSelectedLabel, setGuardSelectedLabel] = React.useState<string>("");
  const [guardSearchTerm, setGuardSearchTerm] = React.useState<string>("");

  const [propertyInput, setPropertyInput] = React.useState("");
  const [propertyId, setPropertyId] = React.useState<number | null>(null);
  const [propertySelectedLabel, setPropertySelectedLabel] = React.useState<string>("");
  const [propertySearchTerm, setPropertySearchTerm] = React.useState<string>("");

  const [rate, setRate] = React.useState<string>("");
  const [monthlyBudget, setMonthlyBudget] = React.useState<string>("");
  
  // Configurar fechas por defecto al primer y último día del año en curso
  const currentYear = new Date().getFullYear();
  const defaultStartDate = `${currentYear}-01-01`;
  const defaultEndDate = `${currentYear}-12-31`;
  
  const [contractStartDate, setContractStartDate] = React.useState<string>(defaultStartDate);
  const [contractEndDate, setContractEndDate] = React.useState<string>(defaultEndDate);
  const [startTime, setStartTime] = React.useState<string>(""); // time "HH:MM"
  const [endTime, setEndTime] = React.useState<string>(""); // time "HH:MM"
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [recurrent, setRecurrent] = React.useState<boolean>(false);

  const [schedule, setSchedule] = React.useState<string[]>([]);
  const [scheduleInput, setScheduleInput] = React.useState<string>(""); // single date input

  React.useEffect(() => {
    const t = setTimeout(() => setGuardSearchTerm(guardInput.trim()), 300);
    return () => clearTimeout(t);
  }, [guardInput]);

  React.useEffect(() => {
    const t = setTimeout(() => setPropertySearchTerm(propertyInput.trim()), 300);
    return () => clearTimeout(t);
  }, [propertyInput]);

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

  // Prefill guard & property when dialog opens (if provided)
  React.useEffect(() => {
    if (!open) return;
    if (initialGuardId != null) {
      setGuardId(initialGuardId);
      if (initialGuardLabel && initialGuardLabel.trim() !== "") {
        setGuardSelectedLabel(initialGuardLabel);
        setGuardInput(initialGuardLabel);
      } else {
        setGuardSelectedLabel("");
        setGuardInput(String(initialGuardId));
      }
    } else {
      // if not provided, reset guard selection for safety
      setGuardId(null);
      setGuardSelectedLabel("");
      setGuardInput("");
    }

    if (initialPropertyId != null) {
      setPropertyId(initialPropertyId);
      if (initialPropertyLabel && initialPropertyLabel.trim() !== "") {
        setPropertySelectedLabel(initialPropertyLabel);
        setPropertyInput(initialPropertyLabel);
      } else {
        setPropertySelectedLabel("");
        setPropertyInput(String(initialPropertyId));
      }
    } else {
      // reset property selection if not provided
      setPropertyId(null);
      setPropertySelectedLabel("");
      setPropertyInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialGuardId, initialGuardLabel, initialPropertyId, initialPropertyLabel]);

  const resetForm = () => {
    const currentYear = new Date().getFullYear();
    const defaultStartDate = `${currentYear}-01-01`;
    const defaultEndDate = `${currentYear}-12-31`;
    
    setName("");
    setDescription("");
    setGuardInput("");
    setGuardId(null);
    setGuardSelectedLabel("");
    setPropertyInput("");
    setPropertyId(null);
    setPropertySelectedLabel("");
    setRate("");
    setMonthlyBudget("");
    setContractStartDate(defaultStartDate);
    setContractEndDate(defaultEndDate);
    setStartTime("");
    setEndTime("");
    setSchedule([]);
    setScheduleInput("");
    setIsActive(true);
    setRecurrent(false);
  };

  const handleCreate = async () => {
    if (!name || name.trim().length === 0) {
      toast.error(TEXT?.services?.errors?.nameRequired ?? "Name is required");
      return;
    }

    const payload: CreateServicePayload = {
      name: name.trim(),
      description: description.trim() === "" ? undefined : description.trim(),
      guard: guardId ?? undefined,
      assigned_property: propertyId ?? undefined,
      rate: rate === "" ? undefined : rate,
      monthly_budget: monthlyBudget === "" ? undefined : monthlyBudget,
      contract_start_date: contractStartDate === "" ? undefined : contractStartDate,
      start_date: contractStartDate === "" ? undefined : contractStartDate,
      end_date: contractEndDate === "" ? undefined : contractEndDate,
      start_time: startTime === "" ? undefined : startTime,
      end_time: endTime === "" ? undefined : endTime,
      schedule: schedule.length > 0 ? schedule : undefined,
      recurrent: recurrent,
      is_active: isActive,
    };

    try {
      setLoading(true);
      await createService(payload);
      toast.success(TEXT?.services?.messages?.created ?? "Service created");
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "services" });
      resetForm();
      onClose();
      if (onCreated) {
        const maybe = onCreated();
        if (maybe && typeof (maybe as any).then === "function") await maybe;
      }
    } catch (err: any) {
      const msg = err?.message ?? TEXT?.services?.errors?.createFailed ?? "Failed to create service";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const addScheduleDate = () => {
    if (!scheduleInput) return;
    if (!schedule.includes(scheduleInput)) {
      setSchedule((s) => [...s, scheduleInput]);
      setScheduleInput("");
    } else {
      toast("Date already added");
    }
  };

  const removeScheduleDate = (d: string) => {
    setSchedule((s) => s.filter((x) => x !== d));
  };

  const guardLabel = (g: Guard) => `${g.firstName} ${g.lastName}${g.email ? ` — ${g.email}` : ""}`;
  const propertyLabel = (p: AppProperty) => `${p.name ?? p.alias ?? "Property #" + p.id} — ${p.address}`;

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

  // Dialog sizing: compact reduce width and height
  const dialogClass = compact
    ? "max-w-2xl w-full max-h-[60vh] overflow-auto"
    : "max-w-4xl w-full max-h-[80vh] overflow-auto";
  const gap = compact ? "gap-2 py-3" : "gap-1 py-0";
  const titleClass = compact ? "text-base" : "text-lg";

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className={`${titleClass} pl-4`}>{TEXT?.services?.create?.title ?? "Create Service"}</DialogTitle>
        </DialogHeader>

        <div className={`grid ${gap} px-4`}>
          <label className="text-sm">{TEXT?.services?.fields?.name ?? "Name"}</label>
          <Input value={name} onChange={(e) => setName(e.currentTarget.value)} />

          <label className="text-sm">{TEXT?.services?.fields?.description ?? "Description"}</label>
          <Textarea value={description} onChange={(e) => setDescription(e.currentTarget.value)} />

          {/* Combobox for Guards */}
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
                placeholder={TEXT?.services?.placeholders?.guard ?? "Type to search guards (e.g. 'Pedro')"}
                aria-autocomplete="list"
              />

              { (Array.isArray(guardsQuery.data) && guardsQuery.data.length > 0 && guardInput.trim().length > 0) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-40 overflow-auto text-sm">
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
                <button
                  type="button"
                  aria-label="Clear guard"
                  onClick={clearGuardSelection}
                  className="absolute right-2 top-2 text-sm opacity-70"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Combobox for Properties */}
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
                placeholder={TEXT?.services?.placeholders?.property ?? "Type to search properties (address/name)"}
                aria-autocomplete="list"
              />

              { (Array.isArray(propsQuery.data) && propsQuery.data.length > 0 && propertyInput.trim().length > 0) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-40 overflow-auto text-sm">
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
                <button
                  type="button"
                  aria-label="Clear property"
                  onClick={clearPropertySelection}
                  className="absolute right-2 top-2 text-sm opacity-70"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.rate ?? "Rate / hr"}</label>
              <Input value={rate} onChange={(e) => setRate(e.currentTarget.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.monthlyBudget ?? "Monthly budget"}</label>
              <Input value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.currentTarget.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.contractStartDate ?? "Contract Start Date"}</label>
              <Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.currentTarget.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Fecha de Inicio</label>
              <Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.currentTarget.value)} />
            </div>
            <div>
              <label className="text-sm">Fecha de Fin</label>
              <Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.currentTarget.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.startTime ?? "Start time"}</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} />
            </div>
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.endTime ?? "End time"}</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.currentTarget.value)} />
            </div>
          </div>

          {/* schedule manager */}
          <div>
            <label className="text-sm">{TEXT?.services?.fields?.schedule ?? "Schedule dates"}</label>
            <div className="flex gap-2 items-center">
              <Input type="date" value={scheduleInput} onChange={(e) => setScheduleInput(e.currentTarget.value)} />
              <Button variant="outline" onClick={addScheduleDate} disabled={!scheduleInput}>{TEXT?.actions?.add ?? "Add"}</Button>
            </div>
            {schedule.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {schedule.map((d) => (
                  <li key={d} className="flex justify-between items-center gap-2">
                    <span>{d}</span>
                    <button type="button" className="text-sm opacity-80" onClick={() => removeScheduleDate(d)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
              <span className="text-sm">{TEXT?.services?.fields?.isActive ?? "Is active"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={recurrent} onCheckedChange={(v) => setRecurrent(Boolean(v))} />
              <span className="text-sm">{TEXT?.services?.fields?.recurrent ?? "Recurrent"}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 px-4 py-0">
            <Button variant="ghost" onClick={() => { resetForm(); onClose(); }}>{TEXT?.actions?.cancel ?? "Cancel"}</Button>
            <Button onClick={handleCreate} disabled={loading}>{loading ? TEXT?.actions?.saving ?? "Saving..." : (TEXT?.actions?.create ?? "Create")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
