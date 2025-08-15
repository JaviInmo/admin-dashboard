"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppProperty, AppPropertyType } from "@/lib/services/properties";
import {
  partialUpdateProperty,
  listPropertyTypesOfService,
} from "@/lib/services/properties";
import { listClients, getClient } from "@/lib/services/clients";
import { toast } from "sonner";

type Props = {
  property: AppProperty;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
};

export default function EditPropertyDialog({ property, onClose, onUpdated }: Props) {
  const normalizeInitialTypes = (): number[] => {
    const tAny: any = (property as any).typesOfService ?? (property as any).types_of_service ?? [];
    if (!Array.isArray(tAny)) return [];
    return tAny
      .map((x: any) => (typeof x === "object" && x !== null ? Number(x.id) : Number(x)))
      .filter((n) => !Number.isNaN(n));
  };

  const [selectedClient, setSelectedClient] = React.useState<any | null>(null);
  const [ownerInput, setOwnerInput] = React.useState<string>("");
  const [ownerPhone, setOwnerPhone] = React.useState<string>(String(property.ownerDetails?.phone ?? ""));
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [searchPage, setSearchPage] = React.useState(1);

  const [name, setName] = React.useState<string>(property.name ?? "");
  const [address, setAddress] = React.useState<string>(property.address ?? "");
  const [types, setTypes] = React.useState<number[]>(normalizeInitialTypes());
  const [monthlyRate, setMonthlyRate] = React.useState<string>(property.monthlyRate ?? "");
  const [contractStartDate, setContractStartDate] = React.useState<string>(property.contractStartDate ?? "");
  const [totalHours, setTotalHours] = React.useState<number | "">(
    typeof property.totalHours === "number" ? property.totalHours : property.totalHours ? Number(property.totalHours) : ""
  );

  const [loading, setLoading] = React.useState(false);
  const [typesLoading, setTypesLoading] = React.useState(false);
  const [availableTypes, setAvailableTypes] = React.useState<AppPropertyType[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);

  // debounce timer
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cargar lista de tipos
  React.useEffect(() => {
    let mounted = true;
    setTypesLoading(true);
    listPropertyTypesOfService(1, 200)
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
      .catch((err) => console.error("listPropertyTypesOfService failed", err))
      .finally(() => {
        if (mounted) setTypesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Inicializar owner: si property.ownerDetails trae nombre, usarlo; si no, fetch client por id (owner)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const od: any = (property as any).ownerDetails ?? null;
        if (od) {
          const label =
            od.username ??
            (od.first_name || od.last_name ? `${od.first_name ?? ""} ${od.last_name ?? ""}`.trim() : null) ??
            (od.user ? `#${od.user}` : null) ??
            (od.id ? `#${od.id}` : "");
          if (mounted) {
            setOwnerInput(String(label ?? ""));
            if (od.id) setSelectedClient(od);
          }
        } else {
          const ownerId = (property as any).owner ?? (property as any).ownerId ?? null;
          if (ownerId) {
            try {
              const client = await getClient(Number(ownerId));
              if (!mounted) return;
              const cliLabel = client.username ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() ?? `#${client.id}`;
              setOwnerInput(cliLabel);
              setSelectedClient(client);
            } catch (err) {
              if (!mounted) return;
              setOwnerInput(`#${ownerId}`);
            }
          } else {
            if (mounted) setOwnerInput("");
          }
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [property]);

  // búsqueda de clientes (debounced)
  const doSearchClients = React.useCallback(
    (q: string, page = 1) => {
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
          const res = await listClients(page, q, 50); // page, search, page_size
          const items: any[] = Array.isArray((res as any).items)
            ? (res as any).items
            : Array.isArray((res as any).results)
            ? (res as any).results
            : Array.isArray(res)
            ? res
            : [];
          setSearchResults(items);
          setSearchPage(1);
        } catch (err) {
          console.error("listClients search failed", err);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    []
  );

  // cuando cambias el texto del owner, lanzas búsqueda
  React.useEffect(() => {
    const label = selectedClient ? (selectedClient.username ?? `${selectedClient.firstName ?? ""} ${selectedClient.lastName ?? ""}`.trim()) : "";
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

  const toggleType = (id: number) => {
    setTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

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
      } else if (ownerPhone && (property as any).ownerDetails) {
        payload.owner_details = { phone: ownerPhone };
      }

      if (name !== undefined) payload.name = name || null;
      if (address !== undefined) payload.address = address;
      payload.types_of_service = Array.isArray(types) ? types : [];
      if (monthlyRate !== undefined) payload.monthly_rate = monthlyRate || null;
      if (contractStartDate !== undefined) payload.contract_start_date = contractStartDate || null;
      if (totalHours !== "" && totalHours !== null && totalHours !== undefined) payload.total_hours = Number(totalHours);

      await partialUpdateProperty(property.id, payload);
      toast.success("Propiedad actualizada");
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error actualizando propiedad", err);
      const msg = err?.response?.data?.detail ?? err?.message ?? "Error actualizando propiedad";
      setError(String(msg));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // Mostrar etiqueta legible de cliente
  const clientLabel = selectedClient
    ? selectedClient.username ?? `${selectedClient.firstName ?? ""} ${selectedClient.lastName ?? ""}`.trim()
    : ownerInput;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar Propiedad</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4 max-h-[82vh] overflow-auto">
          {/* Owner autocomplete */}
          <div>
            <label className="block text-sm">Owner (buscar cliente)</label>
            <div className="relative">
              <Input
                value={ownerInput}
                onChange={(e) => {
                  setOwnerInput(e.target.value);
                  setSelectedClient(null); // si editas el texto, invalidas selección previa
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Buscar cliente por nombre/username..."
              />
              {showDropdown && (searchLoading || searchResults.length > 0) && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border bg-popover p-1">
                  {searchLoading && <div className="px-2 py-1 text-sm">Buscando...</div>}
                  {!searchLoading && searchResults.length === 0 && <div className="px-2 py-1 text-sm">No hay resultados</div>}
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
            <p className="text-xs text-muted-foreground mt-1">Selecciona el cliente propietario. El backend recibirá el id del cliente.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm">Owner phone</label>
              <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} name="ownerPhone" />
            </div>
            <div />
          </div>

          {/* ==== Aquí añadí los labels para Name y Address ==== */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm">Name</label>
              <Input name="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Address</label>
              <Input name="address" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <div>
            <p className="font-medium mb-2">Service Types</p>
            {typesLoading ? (
              <p className="text-sm">Cargando tipos de servicio</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableTypes.length === 0 ? (
                  <p className="text-sm">No hay tipos disponibles</p>
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
            <Input placeholder="Monthly Rate" value={monthlyRate ?? ""} onChange={(e) => setMonthlyRate(e.target.value)} name="monthlyRate" />
            <Input type="date" placeholder="Contract Start Date" value={contractStartDate ?? ""} onChange={(e) => setContractStartDate(e.target.value)} name="contractStartDate" />
            <Input type="number" placeholder="Total Hours" value={totalHours === "" ? "" : String(totalHours)} onChange={(e) => setTotalHours(e.target.value === "" ? "" : Number(e.target.value))} name="totalHours" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end items-center gap-2">
            <Button variant="secondary" onClick={() => onClose()} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="ml-2" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
