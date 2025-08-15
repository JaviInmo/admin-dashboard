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

const INITIAL_CLIENT_DATA: PaginatedResult<Client> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

const pageSize = 10;

export default function ClientsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");

  const { data, isPending, error } = useQuery<PaginatedResult<Client>, string>({
    queryKey: [CLIENT_KEY, search, page],
    queryFn: () => listClients(page, search, pageSize),
    placeholderData: keepPreviousData,
    initialData: INITIAL_CLIENT_DATA,
  });

  const totalPages = Math.max(1, Math.ceil(data.count / pageSize));

  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Clientes</h2>

      {error && (
        <div className="rounded-lg border bg-card p-4 text-red-600">
          {error}
        </div>
      )}

      {isPending && (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p>Cargando clientes...</p>
        </div>
      )}

{/*     ClientsTable render */}
      <ClientsTable
        clients={data.items}
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
      />

      {/* PROPERTIES: always below the table */}
      <div>
        <ClientPropertiesPanel selectedClientId={selectedClientId} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Panel que obtiene label y propiedades y renderiza ClientPropertiesTable    */
/*  (Se renderiza debajo de la tabla de clientes)                             */
/* -------------------------------------------------------------------------- */
function ClientPropertiesPanel({ selectedClientId }: Readonly<{ selectedClientId: number | null }>) {
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

  return (
    <ClientPropertiesTable properties={properties ?? []} clientName={clientLabel} />
  );
}
