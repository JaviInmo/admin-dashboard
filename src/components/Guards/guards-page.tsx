"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import type { PaginatedResult } from "@/lib/pagination";
import { GUARDS_KEY, listGuards } from "@/lib/services/guard";
import type { SortOrder } from "@/lib/sort";
import { generateSort } from "@/lib/sort";
import GuardsTable from "./GuardsTable";
import type { Guard } from "./types";
import { useI18n } from "@/i18n";

/**
 * Mapear campos frontend -> campos que acepta el API (DRF).
 */
function mapGuardSortField(field: keyof Guard): string {
  switch (field) {
    case "firstName":
      return "user__first_name";
    case "lastName":
      return "user__last_name";
    case "email":
      return "user__email";
    case "phone":
      return "phone";
    default:
      return String(field);
  }
}

const INITIAL_GUARD_DATA: PaginatedResult<Guard> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

export default function GuardsPage() {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Guard>("firstName");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  // ordering en formato DRF (ej: "-user__first_name" | "user__first_name" | undefined)
  const apiOrdering = React.useMemo(() => {
    const mapped = mapGuardSortField(sortField);
    return generateSort(mapped, sortOrder); // string | undefined
  }, [sortField, sortOrder]);

  const {
    data = INITIAL_GUARD_DATA,
    isFetching,
    error,
  } = useQuery<PaginatedResult<Guard>, unknown, PaginatedResult<Guard>>({
    queryKey: [GUARDS_KEY, search, page, pageSize, apiOrdering],
    queryFn: () => listGuards(page, search, pageSize, apiOrdering),
    initialData: INITIAL_GUARD_DATA,
    placeholderData: INITIAL_GUARD_DATA,
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

  const toggleSort = (field: keyof Guard) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  React.useEffect(() => {
    if (error) {
      const errorMessage =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : TEXT.guards?.errorLoading ?? "Error loading guards";
      toast.error(errorMessage);
    }
  }, [error, TEXT]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Usa la clave i18n para el título (cambia con el idioma) */}
      <h2 className="text-2xl font-bold">
        {TEXT.guards?.title ?? "Guards Management"}
      </h2>

      <GuardsTable
        guards={data.items}
        onRefresh={() =>
          queryClient.invalidateQueries({
            predicate: (q) =>
              Array.isArray(q.queryKey) && q.queryKey[0] === GUARDS_KEY,
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
        isPageLoading={isFetching}
      />
    </div>
  );
}
