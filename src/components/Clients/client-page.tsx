// src/components/Clients/client-page.tsx
"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as React from "react";
import CreatePropertyDialog from "@/components/Properties/Create/Create";
import { Button } from "@/components/ui/button";
import type { PaginatedResult } from "@/lib/pagination";
import {
  CLIENT_KEY,
  getClient,
  getClientProperties,
  listClients,
} from "@/lib/services/clients";
import type { SortOrder } from "@/lib/sort";
import ClientPropertiesTable from "./client-properties-table";
import ClientsTable from "./clients-table";
import type { Client } from "./types";

const INITIAL_CLIENT_DATA: PaginatedResult<Client> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

export default function ClientsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10); // ahora es state (igual que guards)
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Client>("firstName");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  // Estado para mantener totalPages estable durante loading
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  // handler estilo GuardsPage: reset page a 1 y setSearch
  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  const { data, isFetching, error } = useQuery<PaginatedResult<Client>, string>({
    queryKey: [CLIENT_KEY, search, page, pageSize, sortField, sortOrder],
    queryFn: () => listClients(page, search, pageSize, sortField, sortOrder),
    placeholderData: keepPreviousData,
    initialData: INITIAL_CLIENT_DATA,
  });

  // Actualizar totalPages solo cuando tenemos datos nuevos definitivos
  const totalPages = React.useMemo(() => {
    const newTotalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));
    
    // Solo actualizar si:
    // 1. No estamos cargando Y tenemos datos
    // 2. O es la primera vez que tenemos datos (stableTotalPages === 1)
    if ((!isFetching && data?.count !== undefined) || stableTotalPages === 1) {
      setStableTotalPages(newTotalPages);
      return newTotalPages;
    }
    
    // Mientras cargamos, mantener el valor anterior
    return stableTotalPages;
  }, [data?.count, isFetching, stableTotalPages, pageSize]);

  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(
    null
  );

  // toggleSort replicando exactamente la lógica de GuardsPage
  const toggleSort = (field: keyof Client) => {
    if (sortField === field) {
      // Si es el mismo campo, cambiar orden
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Si es un campo diferente, cambiar campo y empezar con asc
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // helper para refrescar propiedades del cliente actual (lo paso al panel)
  const refreshClientProperties = React.useCallback(async () => {
    if (!selectedClientId) return;
    try {
      await queryClient.invalidateQueries({
        queryKey: ["client-properties", selectedClientId],
      });
    } catch {}
  }, [queryClient, selectedClientId]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Clientes</h2>

      {error && (
        <div className="rounded-lg border bg-card p-4 text-red-600">
          {(error as any)?.message || String(error)}
        </div>
      )}

      {/* ClientsTable render */}
      <ClientsTable
        clients={data?.items ?? []}
        onSelectClient={(id) => setSelectedClientId(id)}
        // invalidamos con predicate como en GuardsPage para cubrir todas las variantes
        onRefresh={() =>
          queryClient.invalidateQueries({
            predicate: (q) =>
              Array.isArray(q.queryKey) && q.queryKey[0] === CLIENT_KEY,
          })
        }
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        pageSize={pageSize}
        onSearch={handleSearch}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
        isPageLoading={isFetching}
      />

      {/* PROPERTIES: always below the table */}
      <div>
        <ClientPropertiesPanel
          selectedClientId={selectedClientId}
          onRefreshProperties={refreshClientProperties}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Panel que obtiene label y propiedades y renderiza ClientPropertiesTable    */
/* -------------------------------------------------------------------------- */
function ClientPropertiesPanel({
  selectedClientId,
  onRefreshProperties,
}: Readonly<{
  selectedClientId: number | null;
  onRefreshProperties?: () => Promise<void> | void;
}>) {
  const queryClient = useQueryClient();

  const [openCreate, setOpenCreate] = React.useState(false);

  // fetch client (for label)
  const {
    data: clientData,
    isLoading: clientLoading,
    error: clientError,
  } = useQuery<Client, string>({
    queryKey: [CLIENT_KEY, "detail", selectedClientId],
    queryFn: () => getClient(selectedClientId ?? 0),
    enabled: selectedClientId != null,
  });

  // fetch properties
  const {
    data: properties,
    isLoading: propsLoading,
    error: propsError,
  } = useQuery<any[], string>({
    queryKey: ["client-properties", selectedClientId],
    queryFn: () => getClientProperties(selectedClientId ?? 0),
    enabled: selectedClientId != null,
  });

  if (!selectedClientId) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">
          Selecciona un cliente para ver sus propiedades.
        </p>
      </div>
    );
  }

  if (clientError) {
    return (
      <div className="rounded-lg border bg-card p-4 text-red-600">
        Error cargando cliente: {String(clientError)}
      </div>
    );
  }

  if (propsError) {
    return (
      <div className="rounded-lg border bg-card p-4 text-red-600">
        Error cargando propiedades: {String(propsError)}
      </div>
    );
  }

  const clientLabel = clientData
    ? `${clientData.firstName ?? ""} ${clientData.lastName ?? ""}`.trim() ||
      clientData.username
    : `#${selectedClientId}`;

  if (clientLoading || propsLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p>Cargando propiedades...</p>
      </div>
    );
  }

  if ((properties ?? []).length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">Este cliente no tiene propiedades</h3>
        <p className="text-sm text-muted-foreground">
          Puedes crear una propiedad para <strong>{clientLabel}</strong>.
        </p>

        <div className="flex items-center gap-3">
          <Button onClick={() => setOpenCreate(true)}>Crear propiedad</Button>
        </div>

        <CreatePropertyDialog
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          clientId={selectedClientId ?? undefined}
          onCreated={async () => {
            await queryClient.invalidateQueries({
              queryKey: ["client-properties", selectedClientId],
            });
            await onRefreshProperties?.();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Propiedades de {clientLabel}</h3>

      <ClientPropertiesTable
        properties={properties ?? []}
        clientName={clientLabel}
        clientId={selectedClientId ?? undefined}
        onOpenCreate={() => setOpenCreate(true)}
        onRefresh={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["client-properties", selectedClientId],
          });
          await onRefreshProperties?.();
        }}
      />

      <CreatePropertyDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        clientId={selectedClientId ?? undefined}
        onCreated={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["client-properties", selectedClientId],
          });
          await onRefreshProperties?.();
        }}
      />
    </div>
  );
}
