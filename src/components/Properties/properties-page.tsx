"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type { PaginatedResult } from "@/lib/pagination";
import {
  type AppProperty,
  listProperties,
  PROPERTY_KEY,
} from "@/lib/services/properties";
import type { SortOrder } from "@/lib/sort";
import PropertiesTable from "./properties-table";
import { generateSort } from "@/lib/sort";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { usePageSize } from "@/hooks/use-page-size";
import { useVisitedPagesCache } from "@/hooks/use-visited-pages-cache";

const INITIAL_PROPERTY_DATA: PaginatedResult<AppProperty> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

/** Mapea keys del frontend a los campos que entiende DRF */
function mapPropertySortField(field?: keyof AppProperty | string): string | undefined {
  switch (field) {
    case "ownerId":
      return "owner";
    case "alias":
      return "alias";
    case "name":
      return "name";
    case "address":
      return "address";
    case "contractStartDate":
      return "contract_start_date";
    case "createdAt":
      return "created_at";
    default:
      return typeof field === "string" ? field : undefined;
  }
}

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();
  const { pageSize, setPageSize } = usePageSize('properties');
  const visitedCache = useVisitedPagesCache<PaginatedResult<AppProperty>>();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof AppProperty>("name");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  // Mantener totalPages estable durante loading
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  const apiOrdering = React.useMemo(() => {
    const mapped = mapPropertySortField(sortField);
    return generateSort(mapped, sortOrder); // string | undefined
  }, [sortField, sortOrder]);

  // Generar queryKey para el caché
  const queryKey = [PROPERTY_KEY, search, page, pageSize, apiOrdering];

  const { data = INITIAL_PROPERTY_DATA, isFetching, error } =
    useQuery<PaginatedResult<AppProperty>, unknown, PaginatedResult<AppProperty>>({
      queryKey,
      queryFn: () => listProperties(page, search, pageSize, apiOrdering),
      initialData: INITIAL_PROPERTY_DATA,
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
        return previousData || INITIAL_PROPERTY_DATA;
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
    if (!isFetching && data && data !== INITIAL_PROPERTY_DATA) {
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

  // Mantener totalPages estable durante loading
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

  const toggleSort = (field: keyof AppProperty | "ownerName") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field as keyof AppProperty);
      setSortOrder("asc");
    }
    setPage(1); // reset page al cambiar orden
  };

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  React.useEffect(() => {
    if (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : "Error loading properties";
      toast.error(errorMessage);
    }
  }, [error, TEXT]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">
        {TEXT.properties?.title ?? "Properties Management"}
      </h2>

      <PropertiesTable
        properties={data?.items ?? []}
        onRefresh={() =>
          queryClient.invalidateQueries({
            predicate: (q) =>
              Array.isArray(q.queryKey) && q.queryKey[0] === PROPERTY_KEY,
          })
        }
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearch={handleSearch}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
        isPageLoading={shouldShowLoading}
      />
    </div>
  );
}
