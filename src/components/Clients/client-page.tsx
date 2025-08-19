// src/components/Clients/client-page.tsx
"use client"

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";
import type { PaginatedResult } from "@/lib/pagination";
import { getClient, getClientProperties, listClients, CLIENT_KEY } from "@/lib/services/clients";
import type { Client } from "./types";
import ClientsTable from "./clients-table";
import ClientPropertiesTable from "./client-properties-table";
import CreatePropertyDialog from "@/components/Properties/Create/Create";
import { Button } from "@/components/ui/button";

const INITIAL_CLIENT_DATA: PaginatedResult<Client> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

const getInitialPageSize = (): number => {
  if (typeof window === 'undefined') return 10;
  const saved = sessionStorage.getItem('clients-page-size');
  return saved ? parseInt(saved, 10) : 10;
};

const getInitialPropertiesPageSize = (): number => {
  if (typeof window === 'undefined') return 5;
  const saved = sessionStorage.getItem('client-properties-page-size');
  return saved ? parseInt(saved, 10) : 5;
};

export default function ClientsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [pageSize, setPageSize] = React.useState<number>(getInitialPageSize);
  const [propertiesPageSize, setPropertiesPageSize] = React.useState<number>(getInitialPropertiesPageSize);

  const handlePageSizeChange = React.useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('clients-page-size', String(newSize));
    }
  }, []);

  const handlePropertiesPageSizeChange = React.useCallback((newSize: number) => {
    setPropertiesPageSize(newSize);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('client-properties-page-size', String(newSize));
    }
  }, []);

  const { data, isPending, error } = useQuery<PaginatedResult<Client>, string>({
    queryKey: [CLIENT_KEY, search, page, pageSize],
    queryFn: () => listClients(page, search, pageSize),
    placeholderData: keepPreviousData,
    initialData: INITIAL_CLIENT_DATA,
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null);

  // helper para refrescar propiedades del cliente actual (lo paso al panel)
  const refreshClientProperties = React.useCallback(async () => {
    if (!selectedClientId) return;
    try {
      await queryClient.invalidateQueries({ queryKey: ["client-properties", selectedClientId] });
    } catch {}
  }, [queryClient, selectedClientId]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Clientes</h2>

      {error && (
        <div className="rounded-lg border bg-card p-4 text-red-600">
          {String(error)}
        </div>
      )}

      {isPending && (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p>Cargando clientes...</p>
        </div>
      )}

      {/* ClientsTable render */}
      <ClientsTable
        clients={data?.items ?? []}
        onSelectClient={(id) => setSelectedClientId(id)}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: [CLIENT_KEY] })
        }
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(page) => setPage(page)}
        pageSize={pageSize}
        onSearch={(term) => {
          setSearch(term);
        }}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* PROPERTIES: always below the table */}
      <div>
        <ClientPropertiesPanel
          selectedClientId={selectedClientId}
          onRefreshProperties={refreshClientProperties}
          propertiesPageSize={propertiesPageSize}
          onPropertiesPageSizeChange={handlePropertiesPageSizeChange}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Panel que obtiene label y propiedades y renderiza ClientPropertiesTable    */
/*  (Se renderiza debajo de la tabla de clientes)                             */
/* -------------------------------------------------------------------------- */
function ClientPropertiesPanel({
  selectedClientId,
  onRefreshProperties,
  propertiesPageSize,
  onPropertiesPageSizeChange,
}: Readonly<{ 
  selectedClientId: number | null; 
  onRefreshProperties?: () => Promise<void> | void;
  propertiesPageSize: number;
  onPropertiesPageSizeChange: (newSize: number) => void;
}>) {
  const queryClient = useQueryClient();

  const [openCreate, setOpenCreate] = React.useState(false);

  // fetch client (for label)
  const { data: clientData, isLoading: clientLoading, error: clientError } = useQuery<Client, string>({
    queryKey: [CLIENT_KEY, "detail", selectedClientId],
    queryFn: () => getClient(selectedClientId ?? 0),
    enabled: selectedClientId != null,
  });

  // fetch properties
  const { data: properties, isLoading: propsLoading, error: propsError } = useQuery<any[], string>({
    queryKey: ["client-properties", selectedClientId],
    queryFn: () => getClientProperties(selectedClientId ?? 0),
    enabled: selectedClientId != null,
  });

  // No selected client -> show hint (below the table)
  if (!selectedClientId) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">Selecciona un cliente para ver sus propiedades.</p>
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

  const clientLabel =
    clientData ? (`${clientData.firstName ?? ""} ${clientData.lastName ?? ""}`.trim() || clientData.username) : `#${selectedClientId}`;

  if (clientLoading || propsLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p>Cargando propiedades...</p>
      </div>
    );
  }

  // Si no tiene propiedades -> mostrar mensaje y botón para crear una
  if ((properties ?? []).length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">Este cliente no tiene propiedades</h3>
        <p className="text-sm text-muted-foreground">Puedes crear una propiedad para <strong>{clientLabel}</strong>.</p>

        <div className="flex items-center gap-3">
          <Button onClick={() => setOpenCreate(true)}>Crear propiedad</Button>
        </div>

        {/* Usamos el Create dialog existente; le pasamos clientId */}
        <CreatePropertyDialog
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          clientId={selectedClientId ?? undefined}
          onCreated={async () => {
            // refrescar lista de propiedades del cliente
            await queryClient.invalidateQueries({ queryKey: ["client-properties", selectedClientId] });
            // aviso al parent (si lo desea)
            await onRefreshProperties?.();
          }}
        />
      </div>
    );
  }

  // Si tiene propiedades -> renderizamos la tabla habitual
  // Nota: el título principal lo dejamos aquí (afuera de la tabla), y el botón "Crear propiedad"
  // se mostrará dentro de ClientPropertiesTable (arriba a la derecha)
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Propiedades de {clientLabel}</h3>

      <ClientPropertiesTable
        properties={properties ?? []}
        clientName={clientLabel}
        clientId={selectedClientId ?? undefined}
        onOpenCreate={() => setOpenCreate(true)}
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ["client-properties", selectedClientId] });
          await onRefreshProperties?.();
        }}
        pageSize={propertiesPageSize}
        onPageSizeChange={onPropertiesPageSizeChange}
      />

      {/* Renderizamos el dialog de creación (invisible hasta openCreate=true) */}
      <CreatePropertyDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        clientId={selectedClientId ?? undefined}
        onCreated={async () => {
          await queryClient.invalidateQueries({ queryKey: ["client-properties", selectedClientId] });
          await onRefreshProperties?.();
        }}
      />
    </div>
  );
}
