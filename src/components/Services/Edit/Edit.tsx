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
import type { Guard } from "@/components/Guards/types";
import { getGuard, listGuards } from "@/lib/services/guard";
import type { AppProperty } from "@/lib/services/properties";
import { getProperty, listProperties } from "@/lib/services/properties";

interface EditServiceDialogProps {
  service: Service;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
  compact?: boolean;
}

export default function EditServiceDialog({ service, open, onClose, onUpdated, compact = false }: EditServiceDialogProps) {
  const { TEXT } = useI18n();
  const qc = useQueryClient();

  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(service.name ?? "");
  const [description, setDescription] = React.useState(service.description ?? "");
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

  const [contractStartDate, setContractStartDate] = React.useState<string>(service.contractStartDate ?? "");
  const [startTime, setStartTime] = React.useState<string>(service.startTime ?? "");
  const [endTime, setEndTime] = React.useState<string>(service.endTime ?? "");
  const [recurrent, setRecurrent] = React.useState<boolean>(service.recurrent ?? false);

  const [schedule, setSchedule] = React.useState<string[]>(Array.isArray(service.schedule) ? service.schedule : []);
  const [scheduleInput, setScheduleInput] = React.useState<string>("");

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
    setContractStartDate(service.contractStartDate ?? "");
    setStartTime(service.startTime ?? "");
    setEndTime(service.endTime ?? "");
    setRecurrent(service.recurrent ?? false);
    setSchedule(Array.isArray(service.schedule) ? service.schedule : []);
    setScheduleInput("");
  }, [service]);

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
      if (!guardInput) setGuardInput(lbl);
    }
  }, [guardDetailQuery.data]);

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
    setContractStartDate(service.contractStartDate ?? "");
    setStartTime(service.startTime ?? "");
    setEndTime(service.endTime ?? "");
    setRecurrent(service.recurrent ?? false);
    setSchedule(Array.isArray(service.schedule) ? service.schedule : []);
    setScheduleInput("");
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
      contract_start_date: contractStartDate === "" ? undefined : contractStartDate,
      start_time: startTime === "" ? undefined : startTime,
      end_time: endTime === "" ? undefined : endTime,
      schedule: schedule.length > 0 ? schedule : undefined,
      recurrent: recurrent,
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

  const dialogClass = compact ? "max-w-2xl w-full" : "max-w-4xl w-full";
  const gap = compact ? "gap-2 py-3" : "gap-3 py-4";
  const titleClass = compact ? "text-base" : "text-lg";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={dialogClass}>
        <DialogHeader>
          <DialogTitle className={titleClass}>{TEXT?.services?.edit?.title ?? "Edit Service"}</DialogTitle>
        </DialogHeader>

        <div className={`grid ${gap}`}>
          <label className="text-sm">{TEXT?.services?.fields?.name ?? "Name"}</label>
          <Input value={name} onChange={(e) => setName(e.currentTarget.value)} />

          <label className="text-sm">{TEXT?.services?.fields?.description ?? "Description"}</label>
          <Textarea value={description ?? ""} onChange={(e) => setDescription(e.currentTarget.value)} />

          <div className="grid grid-cols-2 gap-2">
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
                  <button type="button" aria-label="Clear property" onClick={clearPropertySelection} className="absolute right-2 top-2 text-sm opacity-70">✕</button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.rate ?? "Rate / hr"}</label>
              <Input value={rate ?? ""} onChange={(e) => setRate(e.currentTarget.value)} />
            </div>
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.monthlyBudget ?? "Monthly budget"}</label>
              <Input value={monthlyBudget ?? ""} onChange={(e) => setMonthlyBudget(e.currentTarget.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm">{TEXT?.services?.fields?.contractStartDate ?? "Contract Start Date"}</label>
            <Input type="date" value={contractStartDate ?? ""} onChange={(e) => setContractStartDate(e.currentTarget.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.startTime ?? "Start time"}</label>
              <Input type="time" value={startTime ?? ""} onChange={(e) => setStartTime(e.currentTarget.value)} />
            </div>
            <div>
              <label className="text-sm">{TEXT?.services?.fields?.endTime ?? "End time"}</label>
              <Input type="time" value={endTime ?? ""} onChange={(e) => setEndTime(e.currentTarget.value)} />
            </div>
          </div>

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
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { resetForm(); onClose(); }} disabled={loading}>{TEXT?.actions?.cancel ?? "Cancel"}</Button>
            <Button onClick={handleUpdate} disabled={loading}>{loading ? (TEXT?.actions?.saving ?? "Saving...") : (TEXT?.actions?.save ?? "Save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
