"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressInput } from "@/components/ui/address-input";
import type { AppProperty } from "@/lib/services/properties";
import { partialUpdateProperty } from "@/lib/services/properties";
import { listClients, getClient } from "@/lib/services/clients";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

type Props = {
  property: AppProperty;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
};

export default function EditPropertyDialog({ property, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();

  const asAny = property as any;

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(asAny, k)) return asAny[k];
    }
    return undefined;
  };

  // TEXT shortcuts
  const FORM = TEXT.properties?.form ?? {};
  const FIELD = FORM.fields ?? {};
  const PLACEHOLDERS = FORM.placeholders ?? {};
  const BUTTONS = FORM.buttons ?? {};

  const [selectedClient, setSelectedClient] = React.useState<any | null>(null);
  const [ownerInput, setOwnerInput] = React.useState<string>("");
  const [ownerPhone, setOwnerPhone] = React.useState<string>(
    String(pick("ownerDetails")?.phone ?? pick("owner_details")?.phone ?? "")
  );
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);

  const [name, setName] = React.useState<string>(() => String(pick("name") ?? ""));
  const [alias, setAlias] = React.useState<string>(() => String(pick("alias") ?? ""));
  const [address, setAddress] = React.useState<string>(() => String(pick("address") ?? ""));
  const [contractStartDate, setContractStartDate] = React.useState<string>(() => {
    return String(pick("contractStartDate", "contract_start_date") ?? "");
  });
  const [description, setDescription] = React.useState<string>(() => String(pick("description") ?? ""));

  const [loading, setLoading] = React.useState(false);
  const [initialOwnerLoading, setInitialOwnerLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // cargar owner si no estaba embebido
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const od: any = pick("ownerDetails", "owner_details") ?? null;
        if (od) {
          const label =
            od.username ??
            (od.first_name || od.last_name ? `${od.first_name ?? ""} ${od.last_name ?? ""}`.trim() : null) ??
            (od.user ? `#${od.user}` : null) ??
            (od.id ? `#${od.id}` : "");
          if (mounted) {
            setOwnerInput(String(label ?? ""));
            if (od.id) setSelectedClient(od);
            setOwnerPhone(String(od.phone ?? pick("ownerDetails")?.phone ?? pick("owner_details")?.phone ?? ""));
          }
        } else {
          const ownerId = pick("owner", "ownerId", "owner_id") ?? null;
          if (ownerId) {
            try {
              setInitialOwnerLoading(true);
              const client = await getClient(Number(ownerId));
              if (!mounted) return;
              const cliLabel = client.username ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() ?? `#${client.id}`;
              setOwnerInput(cliLabel);
              setSelectedClient(client);
              setOwnerPhone(String(client.phone ?? ""));
            } catch (err) {
              if (!mounted) return;
              setOwnerInput(`#${ownerId}`);
            } finally {
              if (mounted) setInitialOwnerLoading(false);
            }
          } else {
            if (mounted) setOwnerInput("");
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property]);

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
      ? selectedClient.username ?? `${selectedClient.firstName ?? ""} ${selectedClient.lastName ?? ""}`.trim()
      : "";
    if (ownerInput && label && ownerInput === label) {
      setSearchResults([]);
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

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, any> = {};

      if (selectedClient) {
        payload.owner = selectedClient.id;
        const userId = selectedClient.user ?? selectedClient.user_id ?? selectedClient.userId ?? undefined;
        payload.owner_details = {};
        if (typeof userId !== "undefined") payload.owner_details.user = userId;
        payload.owner_details.phone = ownerPhone || selectedClient.phone || undefined;
      } else if (ownerPhone && (pick("ownerDetails") || pick("owner_details"))) {
        payload.owner_details = { phone: ownerPhone };
      }

      // Sólo los campos que la API espera ahora
      if (name !== undefined) payload.name = name || null;
      if (alias !== undefined) payload.alias = alias || null;
      if (address !== undefined) payload.address = address;
      if (contractStartDate !== undefined) payload.contract_start_date = contract_start_date_or_null(contractStartDate);
      if (description !== undefined) payload.description = description || null;

      await partialUpdateProperty(property.id, payload);
      toast.success(FORM.success ?? "");
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error actualizando propiedad", err);
      const msg = err?.response?.data?.detail ?? err?.message ?? FORM.errorUpdate ?? "";
      setError(String(msg));
      toast.error(String(msg));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  const isInitialLoading = initialOwnerLoading;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{FORM.editTitle ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4 max-h-[82vh] overflow-auto">
          {isInitialLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ) : (
            <>
              {/* Owner autocomplete */}
              <div>
                <label className="block text-sm">{FIELD.ownerUser ?? ""}</label>
                <div className="relative">
                  <Input
                    value={ownerInput}
                    onChange={(e) => {
                      setOwnerInput(e.target.value);
                      setSelectedClient(null);
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    placeholder={PLACEHOLDERS.owner ?? ""}
                  />
                  {showDropdown && (searchLoading || searchResults.length > 0) && (
                    <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border bg-popover p-1">
                      {searchLoading && <div className="px-2 py-1 text-sm">{FORM.searchingText ?? ""}</div>}
                      {!searchLoading && searchResults.length === 0 && <div className="px-2 py-1 text-sm">{FORM.noResultsText ?? ""}</div>}
                      {!searchLoading &&
                        searchResults.map((c) => {
                          const label = c.username ?? `${c.first_name ?? c.firstName ?? ""} ${c.last_name ?? c.lastName ?? ""}`.trim() ?? `#${c.id}`;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className="block w-full text-left px-2 py-1 hover:bg-muted"
                              onClick={() => {
                                setSelectedClient(c);
                                setOwnerInput(label);
                                setOwnerPhone(c.phone ?? "");
                                setShowDropdown(false);
                              }}
                            >
                              <div className="text-sm">{label}</div>
                              <div className="text-xs text-muted-foreground">#{c.id} • {c.phone ?? "-"}</div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{FORM.ownerHelp ?? ""}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{FIELD.ownerPhone ?? ""}</label>
                  <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} name="ownerPhone" />
                </div>
                <div />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{FIELD.name ?? ""}</label>
                  <Input name="name" placeholder={PLACEHOLDERS.name ?? ""} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm">{FIELD.alias ?? ""}</label>
                  <Input name="alias" placeholder={PLACEHOLDERS.alias ?? ""} value={alias} onChange={(e) => setAlias(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  label={FIELD.address ?? ""}
                  placeholder={PLACEHOLDERS.address ?? ""}
                  name="address"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">{FIELD.description ?? ""}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={PLACEHOLDERS.description ?? ""}
                  className="w-full min-h-[100px] resize-y rounded border p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">{FIELD.contractStartDate ?? ""}</label>
                  <Input type="date" value={contractStartDate ?? ""} onChange={(e) => setContractStartDate(e.target.value)} name="contractStartDate" />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end items-center gap-2">
                <Button variant="secondary" onClick={() => onClose()} disabled={loading}>
                  {BUTTONS.cancel ?? ""}
                </Button>
                <Button onClick={handleSubmit} className="ml-2" disabled={loading}>
                  {loading ? (BUTTONS.saving ?? "") : (BUTTONS.save ?? "")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function contract_start_date_or_null(v: string) {
  if (!v) return null;
  return v;
}
