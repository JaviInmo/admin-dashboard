"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle,  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressInput } from "@/components/ui/address-input";
import { toast } from "sonner";
import { createProperty, listPropertyTypesOfService, type AppPropertyType } from "@/lib/services/properties";
import { listClients, getClient } from "@/lib/services/clients";
import { useI18n } from "@/i18n";

type Props = {
  open?: boolean;
  onClose?: () => void;
  onCreated?: () => Promise<void> | void;
  clientId?: number;
};

export default function CreatePropertyDialog({ open = true, onClose, onCreated, clientId }: Props) {
  const { TEXT } = useI18n();

  const [ownerInput, setOwnerInput] = React.useState<string>("");
  const [selectedClient, setSelectedClient] = React.useState<any | null>(null);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searchLoading, setSearchLoading] = React.useState<boolean>(false);
  const [showDropdown, setShowDropdown] = React.useState<boolean>(false);

  const [name, setName] = React.useState<string>("");
  const [alias, setAlias] = React.useState<string>("");
  const [address, setAddress] = React.useState<string>("");
  const [types, setTypes] = React.useState<number[]>([]);
  const [monthlyRate, setMonthlyRate] = React.useState<string>("");
  const [contractStartDate, setContractStartDate] = React.useState<string>("");
  const [totalHours, setTotalHours] = React.useState<string | number>("");

  const [availableTypes, setAvailableTypes] = React.useState<AppPropertyType[]>([]);
  const [typesLoading, setTypesLoading] = React.useState<boolean>(false);
  const [initialClientLoading, setInitialClientLoading] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState<boolean>(false);
  const mountedRef = React.useRef(true);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function resetForm() {
    setOwnerInput("");
    setSelectedClient(null);
    setSearchResults([]);
    setShowDropdown(false);
    setName("");
    setAlias("");
    setAddress("");
    setTypes([]);
    setMonthlyRate("");
    setContractStartDate("");
    setTotalHours("");
  }

  // Cargar tipos de servicio
  React.useEffect(() => {
    let mounted = true;
    setTypesLoading(true);
    listPropertyTypesOfService(1, 500)
      .then((res: any) => {
        if (!mounted) return;
        const items: AppPropertyType[] = Array.isArray((res as any).items)
          ? (res as any).items
          : Array.isArray((res as any).results)
          ? (res as any).results
          : Array.isArray(res)
          ? res
          : [];
        setAvailableTypes(items);
      })
      .catch((err) => {
        console.error("listPropertyTypesOfService failed", err);
        setAvailableTypes([]);
      })
      .finally(() => { if (mounted) setTypesLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Si vino clientId, cargar details
  React.useEffect(() => {
    if (!clientId) return;
    let mounted = true;
    setInitialClientLoading(true);
    (async () => {
      try {
        const detail = await getClient(clientId);
        if (!mounted) return;
        setSelectedClient(detail);
        const label =
          detail.username ??
          `${detail.firstName ?? ""} ${detail.lastName ?? ""}`.trim() ??
          `#${detail.id}`;
        setOwnerInput(label);
        setShowDropdown(false);
      } catch (err) {
        console.error("getClient(clientId) failed", err);
        toast.error(TEXT.properties?.form?.errorRefresh ?? "No se pudo cargar el cliente. Puedes seleccionar otro cliente manualmente.");
      } finally {
        if (mounted) setInitialClientLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [clientId, TEXT]);

  const doSearchClients = React.useCallback((q: string, page = 1) => {
    if (!q || String(q).trim() === "") {
      setSearchResults([]);
      return;
    }
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await listClients(page, q, 50);
        const items: any[] = Array.isArray((res as any).items)
          ? (res as any).items
          : Array.isArray((res as any).results)
          ? (res as any).results
          : Array.isArray(res)
          ? res
          : [];
        setSearchResults(items);
      } catch (err) {
        console.error("listClients search failed", err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  React.useEffect(() => {
    const label = selectedClient
      ? selectedClient.username ?? `${selectedClient.first_name ?? selectedClient.firstName ?? ""} ${selectedClient.last_name ?? selectedClient.lastName ?? ""}`.trim()
      : "";
    if (ownerInput && label && ownerInput === label) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    if (ownerInput && ownerInput.length >= 1) {
      doSearchClients(ownerInput, 1);
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [ownerInput, selectedClient, doSearchClients]);

  const handlePickClient = React.useCallback(async (c: any) => {
    if (c && (c.user !== undefined || c.user_id !== undefined || c.userId !== undefined)) {
      setSelectedClient(c);
      const label = c.username ?? `${c.first_name ?? c.firstName ?? ""} ${c.last_name ?? c.lastName ?? ""}`.trim() ?? `#${c.id}`;
      setOwnerInput(label);
      setShowDropdown(false);
      return;
    }
    try {
      setSearchLoading(true);
      const detailed = await getClient(Number(c.id));
      setSelectedClient(detailed);
      const label = detailed.username ?? `${detailed.firstName ?? ""} ${detailed.lastName ?? ""}`.trim() ?? `#${detailed.id}`;
      setOwnerInput(label);
      setShowDropdown(false);
    } catch (err) {
      console.error("getClient failed", err);
      setSelectedClient(c);
      const label = c.username ?? `${c.first_name ?? c.firstName ?? ""} ${c.last_name ?? c.lastName ?? ""}`.trim() ?? `#${c.id}`;
      setOwnerInput(label);
      setShowDropdown(false);
      toast.error(TEXT.properties?.form?.errorUpdate ?? "No se pudo obtener detalles del cliente; el cliente podría no tener un 'user' asociado.");
    } finally {
      setSearchLoading(false);
    }
  }, [TEXT]);

  const toggleType = (id: number) => {
    setTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (!address || String(address).trim() === "") {
        toast.error(TEXT.properties?.form?.fields?.address ? `${TEXT.properties.form.fields.address} es requerido` : "Address es requerido");
        setLoading(false);
        return;
      }

      if (!selectedClient) {
        toast.error(TEXT.properties?.form?.ownerHelp ?? "Selecciona un cliente del selector.");
        setLoading(false);
        return;
      }

      const userId = selectedClient.user ?? selectedClient.user_id ?? selectedClient.userId ?? undefined;
      const ownerClientId = selectedClient.id ?? undefined;

      if (typeof userId === "undefined") {
        toast.error(TEXT.properties?.form?.errorUpdate ?? "El cliente seleccionado no tiene user id asociado. No se puede crear la propiedad.");
        setLoading(false);
        return;
      }

      const payload: any = {
        address,
        owner: ownerClientId,
        owner_details: { user: Number(userId) },
      };

      if (name) payload.name = name;
      if (alias) payload.alias = alias;
      if (Array.isArray(types) && types.length > 0) payload.types_of_service = types.map(n => Number(n));
      if (monthlyRate) payload.monthly_rate = monthlyRate;
      if (contractStartDate) payload.contract_start_date = contract_start_date_or_null(contractStartDate);
      if (totalHours !== "" && totalHours !== null) payload.total_hours = Number(totalHours);

      await createProperty(payload);

      toast.success(TEXT.properties?.form?.createSuccess ?? "Propiedad creada exitosamente");
      if (!mountedRef.current) return;
      if (onCreated) await onCreated();
      onClose?.();
    } catch (err: any) {
      console.error("Error creando propiedad:", err);
      const server = err?.response?.data ?? err?.message ?? String(err);
      toast.error(typeof server === "object" ? JSON.stringify(server) : String(server));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // Localized strings / fallbacks
  const titleText = TEXT.properties?.form?.createTitle ?? "Crear Propiedad";
  const ownerLabel = TEXT.properties?.form?.fields?.ownerUser ?? "Owner";
  const ownerPlaceholder = TEXT.properties?.form?.placeholders?.owner ?? "Buscar cliente por nombre/username...";
  const nameLabel = TEXT.properties?.form?.fields?.name ?? "Nombre";
  const namePlaceholder = TEXT.properties?.form?.placeholders?.name ?? "Nombre de la propiedad";
  const aliasLabel = TEXT.properties?.form?.fields?.alias ?? "Alias";
  const aliasPlaceholder = TEXT.properties?.form?.placeholders?.alias ?? "Alias o nombre alternativo";
  const addressLabel = TEXT.properties?.form?.fields?.address ?? "Dirección *";
  const addressPlaceholder = TEXT.properties?.form?.placeholders?.address ?? "Dirección de la propiedad";
  const serviceTypesTitle = TEXT.properties?.form?.serviceTypesTitle ?? "Service Types";
  const typesLoadingText = TEXT.properties?.form?.loadingTypesText ?? "Cargando tipos...";
  const noTypesText = TEXT.properties?.form?.noTypesText ?? "No hay tipos disponibles";
  const searchingText = TEXT.properties?.form?.searchingText ?? "Buscando...";
  const noResultsText = TEXT.properties?.form?.noResultsText ?? "No hay resultados";
  const monthlyRateLabel = TEXT.properties?.form?.fields?.monthlyRate ?? "Tarifa Mensual";
  const monthlyRatePlaceholder = TEXT.properties?.form?.placeholders?.monthlyRate ?? "$0.00";
  const contractStartLabel = TEXT.properties?.form?.fields?.contractStartDate ?? "Fecha de Inicio del Contrato";
  const totalHoursLabel = TEXT.properties?.form?.fields?.totalHours ?? "Horas Totales";
  const totalHoursPlaceholder = TEXT.properties?.form?.placeholders?.totalHours ?? "0";
  const cancelText = TEXT.properties?.form?.buttons?.cancel ?? "Cancelar";
  const createText = TEXT.properties?.form?.buttons?.create ?? "Crear";
  const creatingText = TEXT.properties?.form?.buttons?.creating ?? "Creando...";

  const isInitialLoading = typesLoading || initialClientLoading;

  return (
    <Dialog open={!!open} onOpenChange={() => onClose?.()}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 p-4 max-h-[82vh] overflow-auto">
          {isInitialLoading ? (
            // Skeleton layout similar to form
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ) : (
            <>
              {clientId ? (
                <div>
                  <label className="block text-sm">{ownerLabel}</label>
                  <div className="p-2 rounded border bg-muted">
                    {ownerInput || `#${clientId}`}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm">{ownerLabel}</label>
                  <div className="relative">
                    <Input
                      value={ownerInput}
                      onChange={(e) => { setOwnerInput(e.target.value); setSelectedClient(null); }}
                      onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                      placeholder={ownerPlaceholder}
                      name="ownerInput"
                    />
                    {showDropdown && (searchLoading || searchResults.length > 0) && (
                      <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border bg-popover p-1">
                        {searchLoading && <div className="px-2 py-1 text-sm">{searchingText}</div>}
                        {!searchLoading && searchResults.length === 0 && <div className="px-2 py-1 text-sm">{noResultsText}</div>}
                        {!searchLoading && searchResults.map((c) => {
                          const label = c.username ?? `${c.first_name ?? c.firstName ?? ""} ${c.last_name ?? c.lastName ?? ""}`.trim() ?? `#${c.id}`;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className="block w-full text-left px-2 py-1 hover:bg-muted"
                              onClick={() => void handlePickClient(c)}
                            >
                              <div className="text-sm">{label}</div>
                              <div className="text-xs text-muted-foreground">#cliente {c.id} • user:{String(c.user ?? c.user_id ?? "-")}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{nameLabel}</label>
                  <Input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={namePlaceholder} />
                </div>
                <div>
                  <label className="block text-sm">{aliasLabel}</label>
                  <Input name="alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={aliasPlaceholder} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  label={addressLabel}
                  placeholder={addressPlaceholder}
                  name="address"
                  required
                />
              </div>

              <div>
                <p className="font-medium mb-2">{serviceTypesTitle}</p>
                {typesLoading ? (
                  <p className="text-sm">{typesLoadingText}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTypes.length === 0 ? (
                      <p className="text-sm">{noTypesText}</p>
                    ) : (
                      availableTypes.map((t) => {
                        const selected = types.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleType(t.id)}
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm focus:outline-none ${
                              selected ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground"
                            }`}
                            aria-pressed={selected}
                          >
                            <span>{t.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm">{monthlyRateLabel}</label>
                  <Input value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} placeholder={monthlyRatePlaceholder} />
                </div>
                <div>
                  <label className="block text-sm">{contractStartLabel}</label>
                  <Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm">{totalHoursLabel}</label>
                  <Input type="number" value={totalHours === "" ? "" : String(totalHours)} onChange={(e) => setTotalHours(e.target.value === "" ? "" : Number(e.target.value))} placeholder={totalHoursPlaceholder} />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={() => onClose?.()} disabled={loading}>{cancelText}</Button>
            <Button type="submit" disabled={loading}>{loading ? creatingText : createText}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function contract_start_date_or_null(v: string) {
  if (!v) return null;
  return v;
}
