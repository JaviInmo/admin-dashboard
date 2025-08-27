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
    case "monthlyRate":
      return "monthly_rate";
    case "totalHours":
      return "total_hours";
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

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof AppProperty>("name");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  // Mantener totalPages estable durante loading
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  const apiOrdering = React.useMemo(() => {
    const mapped = mapPropertySortField(sortField);
    return generateSort(mapped, sortOrder); // string | undefined
  }, [sortField, sortOrder]);

  const { data = INITIAL_PROPERTY_DATA, isFetching, error } =
    useQuery<PaginatedResult<AppProperty>, unknown, PaginatedResult<AppProperty>>({
      queryKey: [PROPERTY_KEY, search, page, pageSize, apiOrdering],
      queryFn: () => listProperties(page, search, pageSize, apiOrdering),
      initialData: INITIAL_PROPERTY_DATA,
      placeholderData: (previousData) => previousData ?? INITIAL_PROPERTY_DATA,
    });

  // Mantener totalPages estable durante loading
  const totalPages = React.useMemo(() => {
    const newTotalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

    if ((!isFetching && data?.count !== undefined) || stableTotalPages === 1) {
      setStableTotalPages(newTotalPages);
      return newTotalPages;
    }

    return stableTotalPages;
  }, [data?.count, isFetching, stableTotalPages, pageSize]);

  const toggleSort = (field: keyof AppProperty) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
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
          : "Error al cargar propiedades";
      toast.error(errorMessage);
    }
  }, [error]);

  const title =
    (TEXT as any)?.properties?.title ?? "Properties Management";

  // onRefresh que usan los modales: invalida todas las queries relacionadas con PROPERTY_KEY
  // y espera a que la invalidación / refetch termine (asi los modales pueden await onCreated/onUpdated).
  const handleRefresh = React.useCallback(async () => {
    // invalidar cualquier query cuyo queryKey empiece con PROPERTY_KEY
    await queryClient.invalidateQueries({ queryKey: [PROPERTY_KEY], exact: false });
    // opcional: esperar a que las queries se vuelvan a fetch (no siempre necesario)
    // await queryClient.refetchQueries({ queryKey: [PROPERTY_KEY], exact: false });
  }, [queryClient]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{title}</h2>

      <PropertiesTable
        properties={data?.items ?? []}
        // ahora pasamos la función async que invalida/refresh correctamente
        onRefresh={handleRefresh}
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearch={handleSearch}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
        isPageLoading={isFetching}
      />
    </div>
  );
}
