"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { generateSort } from "@/lib/sort"; // si no lo usás directo aquí, puedes quitarlo
import { toast } from "sonner";

const INITIAL_CLIENT_DATA: PaginatedResult<Client> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

/**
 * mapear campos frontend -> campos que acepta el API (DRF)
 */
function mapClientSortField(field?: keyof Client | string): string | undefined {
  switch (field) {
    // nombre completo (cliente) lo mapeo a username/first_name según prefieras
    case "clientName":
      return "user__username";
    case "firstName":
      return "user__first_name";
    case "lastName":
      return "user__last_name";
    case "username":
      return "user__username";
    case "email":
      return "user__email";
    case "phone":
      return "phone";
    case "balance":
      return "balance";
    case "created_at":
      return "created_at";
    default:
      return typeof field === "string" ? field : undefined;
  }
}

export default function ClientsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Client>("firstName");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  // apiOrdering en formato DRF (ej: "-user__first_name" | "user__first_name" | undefined)
  const apiOrdering = React.useMemo(() => {
    const mapped = mapClientSortField(sortField);
    return generateSort(mapped, sortOrder); // string | undefined
  }, [sortField, sortOrder]);

const {
  data = INITIAL_CLIENT_DATA,
  isFetching,
  error,
} = useQuery<PaginatedResult<Client>, unknown, PaginatedResult<Client>>({
  queryKey: [CLIENT_KEY, search, page, pageSize, apiOrdering],
  queryFn: () => listClients(page, search, pageSize, apiOrdering),
  initialData: INITIAL_CLIENT_DATA,
  placeholderData: (previousData) => previousData ?? INITIAL_CLIENT_DATA,
});


  const totalPages = React.useMemo(() => {
    const newTotalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

    if ((!isFetching && data?.count !== undefined) || stableTotalPages === 1) {
      setStableTotalPages(newTotalPages);
      return newTotalPages;
    }

    return stableTotalPages;
  }, [data?.count, isFetching, stableTotalPages, pageSize]);

  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(
    null
  );

  // toggleSort: igual que GuardsPage, y resetea page a 1
  const toggleSort = (field: keyof Client) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const refreshClientProperties = React.useCallback(async () => {
    if (!selectedClientId) return;
    try {
      await queryClient.invalidateQueries({
        queryKey: ["client-properties", selectedClientId],
      });
    } catch {}
  }, [queryClient, selectedClientId]);

  React.useEffect(() => {
    if (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : "Error al cargar clientes";
      toast.error(errorMessage);
    }
  }, [error]);


  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Clientes</h2>

     
      <ClientsTable
        clients={data?.items ?? []}
        onSelectClient={(id) => setSelectedClientId(id)}
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
/*  ClientPropertiesPanel (sin cambios funcionales)                           */
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

  const {
    data: clientData,
    isLoading: clientLoading,
    error: clientError,
  } = useQuery<Client, string>({
    queryKey: [CLIENT_KEY, "detail", selectedClientId],
    queryFn: () => getClient(selectedClientId ?? 0),
    enabled: selectedClientId != null,
  });

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
