"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createProperty } from "@/lib/services/properties";
import { listClients, getClient } from "@/lib/services/clients";
import {
  listPropertyTypesOfService,
  type AppPropertyType,
} from "@/lib/services/properties";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => Promise<void> | void;
};

export default function CreatePropertyDialog({ open, onClose, onCreated }: Props) {
  const [ownerInput, setOwnerInput] = React.useState<string>("");
  const [selectedClient, setSelectedClient] = React.useState<any | null>(null);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searchLoading, setSearchLoading] = React.useState<boolean>(false);
  const [showDropdown, setShowDropdown] = React.useState<boolean>(false);
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = React.useState<string>("");
  const [address, setAddress] = React.useState<string>("");
  const [types, setTypes] = React.useState<number[]>([]);
  const [monthlyRate, setMonthlyRate] = React.useState<string>("");
  const [contractStartDate, setContractStartDate] = React.useState<string>("");
  const [totalHours, setTotalHours] = React.useState<string | number>("");

  const [availableTypes, setAvailableTypes] = React.useState<AppPropertyType[]>([]);
  const [typesLoading, setTypesLoading] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState<boolean>(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  React.useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function resetForm() {
    setOwnerInput("");
    setSelectedClient(null);
    setSearchResults([]);
    setShowDropdown(false);
    setName("");
    setAddress("");
    setTypes([]);
    setMonthlyRate("");
    setContractStartDate("");
    setTotalHours("");
  }

  // Load service types (tags)
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

  // debounced clients search
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

  // when ownerInput changes, search clients unless it's equal to selected label
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

  // pick client from dropdown (ensure we have client.user)
  const handlePickClient = React.useCallback(async (c: any) => {
    if (!c) return;
    // If object already contains user field accept it
    if (c && (c.user !== undefined || c.user_id !== undefined || c.userId !== undefined)) {
      setSelectedClient(c);
      const label = c.username ?? `${c.first_name ?? c.firstName ?? ""} ${c.last_name ?? c.lastName ?? ""}`.trim() ?? `#${c.id}`;
      setOwnerInput(label);
      setShowDropdown(false);
      return;
    }

    // Otherwise fetch detailed client
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
      toast.error("No se pudo obtener detalles del cliente; es posible que no tenga 'user' asociado.");
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const toggleType = (id: number) => {
    setTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (!address || String(address).trim() === "") {
        toast.error("Address es requerido");
        setLoading(false);
        return;
      }

      if (!selectedClient) {
        toast.error("Selecciona un cliente del selector.");
        setLoading(false);
        return;
      }

      // extract user id from selectedClient
      const userId = selectedClient.user ?? selectedClient.user_id ?? selectedClient.userId ?? undefined;
      const clientId = selectedClient.id ?? undefined;

      if (typeof userId === "undefined") {
        toast.error("El cliente seleccionado no tiene 'user' asociado. Selecciona otro cliente.");
        setLoading(false);
        return;
      }

      const payload: any = {
        address,
        owner: clientId,
        owner_details: { user: Number(userId) }, // ONLY user, no phone
      };

      if (name) payload.name = name;
      if (Array.isArray(types) && types.length > 0) payload.types_of_service = types.map(n => Number(n));
      if (monthlyRate) payload.monthly_rate = monthlyRate;
      if (contractStartDate) payload.contract_start_date = contractStartDate;
      if (totalHours !== "" && totalHours !== null) payload.total_hours = Number(totalHours);

      await createProperty(payload);

      toast.success("Propiedad creada");
      if (!mountedRef.current) return;
      if (onCreated) await onCreated();
      onClose();
    } catch (err: any) {
      console.error("Error creando propiedad:", err);
      const server = err?.response?.data ?? err?.message ?? String(err);
      toast.error(typeof server === "object" ? JSON.stringify(server) : String(server));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <h3 className="text-lg font-semibold mb-2">Crear Propiedad</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Owner autocomplete */}
          <div>
            <label className="block text-sm">Owner (buscar cliente)</label>
            <div className="relative">
              <Input
                value={ownerInput}
                onChange={(e) => { setOwnerInput(e.target.value); setSelectedClient(null); }}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="Buscar cliente por nombre/username..."
                name="ownerInput"
              />
              {showDropdown && (searchLoading || searchResults.length > 0) && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded border bg-popover p-1">
                  {searchLoading && <div className="px-2 py-1 text-sm">Buscando...</div>}
                  {!searchLoading && searchResults.length === 0 && <div className="px-2 py-1 text-sm">No hay resultados</div>}
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
            <p className="text-xs text-muted-foreground mt-1">
              Selecciona el cliente propietario. Se enviará <code>owner_details.user</code> (user id) del cliente seleccionado.
            </p>
          </div>

          {/* Name / Address */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm">Name</label>
              <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Address *</label>
              <Input name="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
          </div>

          {/* Service types as tags */}
          <div>
            <p className="font-medium mb-2">Service Types</p>
            {typesLoading ? (
              <p className="text-sm">Cargando tipos...</p>
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
            <div>
              <label className="block text-sm">Monthly Rate</label>
              <Input value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Contract Start Date</label>
              <Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Total Hours</label>
              <Input type="number" value={totalHours === "" ? "" : String(totalHours)} onChange={(e) => setTotalHours(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Inline styles para modal simple */
const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
};

const modalStyle: React.CSSProperties = {
  width: 700,
  maxWidth: "95%",
  background: "var(--card-background, #fff)",
  padding: 20,
  borderRadius: 8,
  boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
};
