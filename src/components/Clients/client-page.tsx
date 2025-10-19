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
import { generateSort } from "@/lib/sort";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { usePageSize } from "@/hooks/use-page-size";
import { useVisitedPagesCache } from "@/hooks/use-visited-pages-cache";

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

/**
 * Helper de plantilla accesible para todo el módulo.
 * Reemplaza {key} por el valor proporcionado en vars.
 */
function formatTemplate(tpl?: string, vars?: Record<string, string>) {
  if (!tpl) return "";
  let out = tpl;
  Object.entries(vars ?? {}).forEach(([k, v]) => {
    out = out.split(`{${k}}`).join(v);
  });
  return out;
}

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();
  const { pageSize, setPageSize } = usePageSize('clients');
  const visitedCache = useVisitedPagesCache<PaginatedResult<Client>>();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Client>("firstName");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  const handleSearch = React.useCallback((term: string) => {
    setSearch(term);
    setPage(1);
  }, []);

  // apiOrdering en formato DRF (ej: "-user__first_name" | "user__first_name" | undefined)
  const apiOrdering = React.useMemo(() => {
    const mapped = mapClientSortField(sortField);
    return generateSort(mapped, sortOrder); // string | undefined
  }, [sortField, sortOrder]);

  // Generar queryKey para el caché
  const queryKey = [CLIENT_KEY, search, page, pageSize, apiOrdering];

  const {
    data = INITIAL_CLIENT_DATA,
    isFetching,
    error,
  } = useQuery<PaginatedResult<Client>, unknown, PaginatedResult<Client>>({
    queryKey,
    queryFn: () => listClients(page, search, pageSize, apiOrdering),
    initialData: INITIAL_CLIENT_DATA,
    placeholderData: (previousData) => {
      // Usar datos de páginas visitadas si existen, sino usar datos anteriores
      const cachedData = visitedCache.get(queryKey);
      if (cachedData) {
        // Verificar que los datos cached sean válidos para la página actual
        const maxPage = Math.max(1, Math.ceil(cachedData.count / pageSize));
        if (page <= maxPage) {
          return cachedData;
        }
      }
      return previousData || INITIAL_CLIENT_DATA;
    },
    // Si tenemos datos en caché válidos, no mostrar loading
    refetchOnMount: () => {
      const cachedData = visitedCache.get(queryKey);
      if (cachedData) {
        const maxPage = Math.max(1, Math.ceil(cachedData.count / pageSize));
        return page > maxPage; // Solo refetch si la página es inválida
      }
      return true; // Refetch si no hay datos cached
    },
  });

  // Guardar datos cuando se cargan exitosamente
  React.useEffect(() => {
    if (!isFetching && data && data !== INITIAL_CLIENT_DATA) {
      visitedCache.set(queryKey, data);
    }
  }, [data, isFetching, queryKey, visitedCache]);

  // Determinar si mostrar loading basado en si tenemos datos cached válidos
  const shouldShowLoading = isFetching && (() => {
    const cachedData = visitedCache.get(queryKey);
    if (cachedData) {
      const maxPage = Math.max(1, Math.ceil(cachedData.count / pageSize));
      return page > maxPage; // Mostrar loading si la página es inválida
    }
    return true; // Mostrar loading si no hay datos cached
  })();

  const totalPages = React.useMemo(() => {
    const newTotalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

    if ((!isFetching && data?.count !== undefined) || stableTotalPages === 1) {
      setStableTotalPages(newTotalPages);
      return newTotalPages;
    }

    return stableTotalPages;
  }, [data?.count, isFetching, stableTotalPages, pageSize]);

  // Verificar si la página actual es mayor que el total y ajustar
  React.useEffect(() => {
    if (!isFetching && totalPages > 0 && page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages, isFetching]);

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
    } catch {
      // Ignore query invalidation errors (may fail if cache is corrupted)
    }
  }, [queryClient, selectedClientId]);

  React.useEffect(() => {
    if (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : TEXT.clients?.errorLoading ?? "Error al cargar clientes";
      toast.error(errorMessage);
    }
  }, [error, TEXT]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">
        {TEXT.clients?.title ?? "Clients Management"}
      </h2>

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
        isPageLoading={shouldShowLoading}
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
/*  ClientPropertiesPanel (sin cambios funcionales, ahora con i18n)          */
/* -------------------------------------------------------------------------- */
function ClientPropertiesPanel({
  selectedClientId,
  onRefreshProperties,
}: Readonly<{
  selectedClientId: number | null;
  onRefreshProperties?: () => Promise<void> | void;
}>) {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();

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
          {TEXT.clients?.selectPrompt ?? "Selecciona un cliente para ver sus propiedades."}
        </p>
      </div>
    );
  }

  if (clientError) {
    return (
      <div className="rounded-lg border bg-card p-4 text-red-600">
        {TEXT.clients?.errorLoading ?? "Error cargando cliente"}: {String(clientError)}
      </div>
    );
  }

  if (propsError) {
    return (
      <div className="rounded-lg border bg-card p-4 text-red-600">
        {TEXT.clients?.propertiesError ?? "Error cargando propiedades"}: {String(propsError)}
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
        <p>{TEXT.clients?.propertiesLoading ?? "Cargando propiedades..."}</p>
      </div>
    );
  }

  if ((properties ?? []).length === 0) {
    // TEXT.clients?.properties?.noResultsText no existe en tus ui-text.* -> usar cast any o fallback
    const noResultsText = (TEXT.clients as any)?.properties?.noResultsText ?? `Puedes crear una propiedad para ${clientLabel}.`;

    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
        <h3 className="text-lg font-semibold">
          {TEXT.clients?.properties?.title
            ? formatTemplate(TEXT.clients.properties.title, { clientName: clientLabel })
            : `Propiedades de ${clientLabel}`}
        </h3>
        <p className="text-sm text-muted-foreground">
          {noResultsText}
        </p>

        <div className="flex items-center gap-3">
          <Button onClick={() => setOpenCreate(true)}>
            {TEXT.properties?.form?.buttons?.create ?? "Crear propiedad"}
          </Button>
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
      <h3 className="text-lg font-semibold mb-3">
        {TEXT.clients?.properties?.title
          ? formatTemplate(TEXT.clients.properties.title, { clientName: clientLabel })
          : `Propiedades de ${clientLabel}`}
      </h3>

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
