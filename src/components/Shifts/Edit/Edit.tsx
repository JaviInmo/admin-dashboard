"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getShift, updateShift } from "@/lib/services/shifts";
import { listGuards, getGuard } from "@/lib/services/guard";
import { listProperties, getProperty } from "@/lib/services/properties";
import { listServices, getService } from "@/lib/services/services";
import type { Shift } from "../types";
import { useI18n } from "@/i18n";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";
import type { Service as AppService } from "@/components/Services/types";

type EditShiftProps = {
  open: boolean;
  onClose: () => void;
  shiftId?: number;
  initialShift?: Shift;
  onUpdated?: (shift: Shift) => void;
};

function toIsoFromDatetimeLocal(value: string) {
  const d = new Date(value);
  return d.toISOString();
}

function isoToLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

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

export default function EditShift({ open, onClose, shiftId, initialShift, onUpdated }: EditShiftProps) {
  const { TEXT } = useI18n();

  const [shift, setShift] = React.useState<Shift | null>(initialShift ?? null);
  const [loadingShift, setLoadingShift] = React.useState(false);

  // guard
  const [selectedGuard, setSelectedGuard] = React.useState<Guard | null>(null);
  const [guardQuery, setGuardQuery] = React.useState<string>("");
  const debouncedGuardQuery = useDebouncedValue(guardQuery, 300);
  const [guardResults, setGuardResults] = React.useState<Guard[]>([]);
  const [guardsLoading, setGuardsLoading] = React.useState(false);
  const [guardDropdownOpen, setGuardDropdownOpen] = React.useState(false);

  // property
  const [selectedProperty, setSelectedProperty] = React.useState<AppProperty | null>(null);
  const [propertyQuery, setPropertyQuery] = React.useState<string>("");
  const debouncedPropertyQuery = useDebouncedValue(propertyQuery, 300);
  const [propertyResults, setPropertyResults] = React.useState<AppProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = React.useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = React.useState(false);

  // service
  const [selectedService, setSelectedService] = React.useState<AppService | null>(null);
  const [serviceQuery, setServiceQuery] = React.useState<string>("");
  const debouncedServiceQuery = useDebouncedValue(serviceQuery, 300);
  const [serviceResults, setServiceResults] = React.useState<AppService[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = React.useState(false);

  // datetimes / status / loading
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");
  const [status, setStatus] = React.useState<Shift["status"]>("scheduled");
  const [loading, setLoading] = React.useState(false);

  // is_armed
  const [isArmed, setIsArmed] = React.useState<boolean>(false);

  const guardPlaceholder =
    (TEXT as any)?.guards?.table?.searchPlaceholder ?? "Buscar guard por nombre o email...";
  const propertyPlaceholder =
    (TEXT as any)?.properties?.table?.searchPlaceholder ?? "Buscar propiedades...";
  const servicePlaceholder =
    (TEXT as any)?.services?.table?.searchPlaceholder ?? "Buscar servicios...";

  React.useEffect(() => {
    if (!open) {
      setShift(initialShift ?? null);
      setLoadingShift(false);

      setSelectedGuard(null);
      setGuardQuery("");
      setGuardResults([]);
      setGuardsLoading(false);
      setGuardDropdownOpen(false);

      setSelectedProperty(null);
      setPropertyQuery("");
      setPropertyResults([]);
      setPropertiesLoading(false);
      setPropertyDropdownOpen(false);

      setSelectedService(null);
      setServiceQuery("");
      setServiceResults([]);
      setServicesLoading(false);
      setServiceDropdownOpen(false);

      setStart("");
      setEnd("");
      setStatus("scheduled");
      setIsArmed(false);
      setLoading(false);
    }
  }, [open, initialShift]);

  React.useEffect(() => {
    if (!open) return;

    let mounted = true;

    const load = async () => {
      setLoadingShift(true);
      try {
        let s: Shift | null = null;
        if (initialShift) {
          s = initialShift;
        } else if (shiftId) {
          s = (await getShift(shiftId)) as Shift;
        }

        if (!s) {
          if (mounted) {
            setShift(null);
            toast.error((TEXT as any)?.shifts?.errors?.noShift ?? "No shift loaded");
            onClose();
          }
          return;
        }

        if (!mounted) return;

        setShift(s);
        setStart(isoToLocalInputValue((s as any).startTime));
        setEnd(isoToLocalInputValue((s as any).endTime));
        setStatus((s as any).status ?? "scheduled");
        setIsArmed(Boolean((s as any).isArmed));

        // PREFILL GUARD
        try {
          if ((s as any).guardDetails) {
            const gd: any = (s as any).guardDetails;
            const gObj: Guard = {
              id: Number(gd.id ?? (s as any).guard),
              user: (gd.user as any) ?? undefined,
              firstName: gd.first_name ?? gd.firstName ?? gd.name ?? "",
              lastName: gd.last_name ?? gd.lastName ?? "",
              email: gd.email ?? "",
            } as Guard;
            setSelectedGuard(gObj);
            setGuardQuery(`${gObj.firstName} ${gObj.lastName} (${gObj.email ?? ""})`);
          } else if ((s as any).guard) {
            const guardIdNum = Number((s as any).guard);
            try {
              const g = await getGuard(guardIdNum);
              if (!mounted) return;
              if (g) {
                setSelectedGuard(g);
                setGuardQuery(`${g.firstName} ${g.lastName} (${g.email ?? ""})`);
              } else {
                setGuardQuery(String((s as any).guard));
              }
            } catch (err) {
              setGuardQuery(String((s as any).guard ?? ""));
            }
          }
        } catch (e) {
          console.error("prefill guard failed", e);
          setGuardQuery(String((s as any).guard ?? ""));
        }

        // PREFILL PROPERTY
        try {
          if ((s as any).propertyDetails) {
            const pd: any = (s as any).propertyDetails;

            const pObj = {
              id: Number(pd.id ?? (s as any).property),
              ownerId: pd.owner !== undefined
                ? Number(pd.owner)
                : pd.owner_id !== undefined
                ? Number(pd.owner_id)
                : pd.owner_details?.id !== undefined
                ? Number(pd.owner_details.id)
                : undefined,
              name: pd.name ?? pd.title ?? "",
              alias: pd.alias ?? undefined,
              address: pd.address ?? undefined,
              description: pd.description ?? undefined,
            } as unknown as AppProperty;

            setSelectedProperty(pObj);
            setPropertyQuery(`${pObj.name ?? pObj.alias ?? pObj.address} #${pObj.id}`);
          } else if ((s as any).property) {
            const propertyIdNum = Number((s as any).property);
            try {
              const p = await getProperty(propertyIdNum);
              if (!mounted) return;
              if (p) {
                setSelectedProperty(p);
                setPropertyQuery(`${p.name ?? p.alias ?? p.address} #${p.id}`);
              } else {
                setPropertyQuery(String((s as any).property));
              }
            } catch (err) {
              setPropertyQuery(String((s as any).property ?? ""));
            }
          }
        } catch (e) {
          console.error("prefill property failed", e);
          setPropertyQuery(String((s as any).property ?? ""));
        }

        // PREFILL SERVICE (opcional)
        try {
          if ((s as any).serviceDetails) {
            const sd: any = (s as any).serviceDetails;
            const svc: AppService = {
              id: Number(sd.id ?? (s as any).service),
              name: sd.name ?? "",
              description: sd.description ?? "",
              propertyName: sd.property_name ?? sd.propertyName ?? undefined,
            } as AppService;
            setSelectedService(svc);
            setServiceQuery(`${svc.name}`);
          } else if ((s as any).service) {
            const serviceIdNum = Number((s as any).service);
            try {
              // intentar obtener con getService
              if (typeof getService === "function") {
                const svc = await getService(serviceIdNum);
                if (!mounted) return;
                if (svc) {
                  setSelectedService(svc as AppService);
                  setServiceQuery(`${svc.name}`);
                } else {
                  setServiceQuery(String(serviceIdNum));
                }
              } else {
                setServiceQuery(String(serviceIdNum));
              }
            } catch (err) {
              setServiceQuery(String((s as any).service ?? ""));
            }
          }
        } catch (e) {
          console.error("prefill service failed", e);
          setServiceQuery(String((s as any).service ?? ""));
        }
      } catch (err) {
        console.error(err);
        toast.error((TEXT as any)?.shifts?.errors?.fetchFailed ?? "Could not load shift");
        onClose();
      } finally {
        if (mounted) setLoadingShift(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [open, shiftId, initialShift]);

  // Guard search
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

  // Property search
  React.useEffect(() => {
    let mounted = true;
    const q = (debouncedPropertyQuery ?? "").trim();
    if (q === "") {
      setPropertyResults([]);
      return;
    }
    setPropertiesLoading(true);
    (async () => {
      try {
        const res = await listProperties(1, q, 10);
        if (!mounted) return;
        const items = extractItems<AppProperty>(res);
        setPropertyResults(items);
        setPropertyDropdownOpen(true);
      } catch (err) {
        console.error("listProperties error", err);
        setPropertyResults([]);
      } finally {
        if (mounted) setPropertiesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debouncedPropertyQuery]);

  // Service search
  React.useEffect(() => {
    let mounted = true;
    const q = (debouncedServiceQuery ?? "").trim();
    if (q === "") {
      setServiceResults([]);
      return;
    }
    setServicesLoading(true);
    (async () => {
      try {
        const res = await listServices(1, q, 10, "name");
        if (!mounted) return;
        const items = extractItems<AppService>(res);
        setServiceResults(items);
        setServiceDropdownOpen(true);
      } catch (err) {
        console.error("listServices error", err);
        setServiceResults([]);
      } finally {
        if (mounted) setServicesLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debouncedServiceQuery]);

  const guardLabel = (g?: Guard | null) => {
    if (!g) return "";
    return `${g.firstName} ${g.lastName} (${g.email ?? ""})`;
  };
  const propertyLabel = (p?: AppProperty | null) => {
    if (!p) return "";
    return `${p.name ?? p.alias ?? p.address} #${p.id}`;
  };
  const serviceLabel = (s?: AppService | null) => {
    if (!s) return "";
    return `${s.name}${s.propertyName ? ` — ${s.propertyName}` : ""}`;
  };

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    if (!shift) {
      toast.error((TEXT as any)?.shifts?.errors?.noShift ?? "No shift to edit");
      return;
    }
    if (!start || !end) {
      toast.error((TEXT as any)?.shifts?.errors?.missingDates ?? "Start and end are required");
      return;
    }
    const startIso = toIsoFromDatetimeLocal(start);
    const endIso = toIsoFromDatetimeLocal(end);

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error((TEXT as any)?.shifts?.errors?.endBeforeStart ?? "End must be after start");
      return;
    }

    if (!selectedProperty) {
      toast.error((TEXT as any)?.shifts?.errors?.missingProperty ?? "Property required");
      return;
    }
    if (!selectedGuard) {
      toast.error((TEXT as any)?.shifts?.errors?.missingGuard ?? "Guard required");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        property: Number(selectedProperty.id),
        start_time: startIso,
        end_time: endIso,
        status,
      };
      if (selectedGuard) payload.guard = Number(selectedGuard.id);
      if (selectedService) payload.service = Number(selectedService.id);
      if (typeof isArmed === "boolean") payload.is_armed = isArmed;

      const updated = await updateShift(shift.id, payload);
      toast.success((TEXT as any)?.shifts?.messages?.updated ?? "Shift updated");
      onUpdated?.(updated as Shift);
      onClose();
    } catch (err: any) {
      console.error(err);
      const serverMsg = err?.response?.data?.message ?? err?.message;
      if (serverMsg) {
        toast.error(String(serverMsg));
      } else {
        toast.error((TEXT as any)?.shifts?.errors?.updateFailed ?? "Could not update shift");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{(TEXT as any)?.shifts?.edit?.title ?? "Editar Turno"}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {loadingShift ? (
            <div>{(TEXT as any)?.common?.loading ?? "Loading..."}</div>
          ) : !shift ? (
            <div>{(TEXT as any)?.shifts?.errors?.noShift ?? "No shift loaded"}</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Shift ID</label>
                <input className="w-full rounded border px-3 py-2" value={shift.id} readOnly />
              </div>

              {/* Guard select-search */}
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
                  placeholder={guardPlaceholder}
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

              {/* Property select-search */}
              <div className="relative">
                <label className="text-sm text-muted-foreground block mb-1">Property</label>
                <input
                  type="text"
                  className="w-full rounded border px-3 py-2"
                  value={selectedProperty ? propertyLabel(selectedProperty) : propertyQuery}
                  onChange={(e) => {
                    if (selectedProperty) setSelectedProperty(null);
                    setPropertyQuery(e.target.value);
                  }}
                  onFocus={() => {
                    if (propertyResults.length > 0) setPropertyDropdownOpen(true);
                  }}
                  placeholder={propertyPlaceholder}
                  aria-label="Buscar propiedad"
                />
                {selectedProperty && (
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setSelectedProperty(null);
                      setPropertyQuery("");
                    }}
                  >
                    Clear
                  </button>
                )}

                {propertyDropdownOpen && (propertyResults.length > 0 || propertiesLoading) && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-56 overflow-auto">
                    {propertiesLoading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
                    {!propertiesLoading && propertyResults.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matches.</div>}
                    {!propertiesLoading &&
                      propertyResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/10"
                          onClick={() => {
                            setSelectedProperty(p);
                            setPropertyQuery(propertyLabel(p));
                            setPropertyDropdownOpen(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="text-sm truncate">{p.name ?? p.alias ?? p.address}</div>
                            <div className="text-xs text-muted-foreground">#{p.id}</div>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{p.address}</div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Service select-search (opcional) */}
              <div className="relative">
                <label className="text-sm text-muted-foreground block mb-1">Service (opcional)</label>
                <input
                  type="text"
                  className="w-full rounded border px-3 py-2"
                  value={selectedService ? serviceLabel(selectedService) : serviceQuery}
                  onChange={(e) => {
                    if (selectedService) setSelectedService(null);
                    setServiceQuery(e.target.value);
                  }}
                  onFocus={() => {
                    if (serviceResults.length > 0) setServiceDropdownOpen(true);
                  }}
                  placeholder={servicePlaceholder}
                  aria-label="Buscar servicio"
                />
                {selectedService && (
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setSelectedService(null);
                      setServiceQuery("");
                    }}
                  >
                    Clear
                  </button>
                )}

                {serviceDropdownOpen && (serviceResults.length > 0 || servicesLoading) && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow max-h-56 overflow-auto">
                    {servicesLoading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
                    {!servicesLoading && serviceResults.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matches.</div>}
                    {!servicesLoading &&
                      serviceResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted/10"
                          onClick={() => {
                            setSelectedService(s);
                            setServiceQuery(serviceLabel(s));
                            setServiceDropdownOpen(false);
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="text-sm truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.propertyName ?? ""}</div>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{s.description}</div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Start</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border px-3 py-2"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">End</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded border px-3 py-2"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Shift["status"])}
                  className="w-full rounded border px-3 py-2"
                >
                  <option value="scheduled">scheduled</option>
                  <option value="completed">completed</option>
                  <option value="voided">voided</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isArmed} onChange={(e) => setIsArmed(Boolean(e.target.checked))} />
                  <span className="text-sm">Is armed</span>
                </label>
                {/* weapon details are typically readOnly from backend; not sending by default */}
                {shift?.weaponDetails && (
                  <div className="text-sm text-muted-foreground">Weapon: {shift.weaponDetails}</div>
                )}
              </div>

              <DialogFooter>
                <div className="flex justify-end gap-2 w-full">
                  <Button variant="ghost" onClick={onClose} type="button">{(TEXT as any)?.actions?.cancel ?? "Close"}</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (TEXT as any)?.actions?.saving ?? "Saving..." : (TEXT as any)?.actions?.save ?? "Save"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
