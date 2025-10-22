"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import type { PaginatedResult } from "@/lib/pagination";
import { GUARDS_KEY, listGuards } from "@/lib/services/guard";
import type { SortOrder } from "@/lib/sort";
import { generateSort } from "@/lib/sort";
import GuardsTable from "./GuardsTable";
import type { Guard } from "./types";
import { useI18n } from "@/i18n";
import { usePageSize } from "@/hooks/use-page-size";
import { useVisitedPagesCache } from "@/hooks/use-visited-pages-cache";

/**
 * Mapear campos frontend -> campos que acepta el API (DRF).
 */
function mapGuardSortField(field: keyof Guard | string): string {
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
  const { pageSize, setPageSize } = usePageSize('guards');
  
  // Hook para cachear páginas visitadas
  const visitedCache = useVisitedPagesCache<PaginatedResult<Guard>>();

  const location = useLocation();
  const [initialShiftGuard, setInitialShiftGuard] = React.useState<Guard | null>(null);

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Guard | string>("firstName");
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

  // Query key para el caché
  const queryKey = [GUARDS_KEY, search, page, pageSize, apiOrdering];

  const {
    data = INITIAL_GUARD_DATA,
    isFetching,
    error,
  } = useQuery<PaginatedResult<Guard>, unknown, PaginatedResult<Guard>>({
    queryKey,
    queryFn: () => listGuards(page, search, pageSize, apiOrdering),
    initialData: INITIAL_GUARD_DATA,
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
      return previousData || INITIAL_GUARD_DATA;
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

  // Efecto para manejar navegación con state (abrir modal de shifts automáticamente)
  React.useEffect(() => {
    const state = location.state as { openGuardShifts?: number; guardName?: string } | null;
    if (state?.openGuardShifts && data && data.items && data.items.length > 0 && !isFetching) {
      const guard = data.items.find((g: Guard) => g.id === state.openGuardShifts);
      if (guard) {
        setInitialShiftGuard(guard);
        // Limpiar el state para evitar reabrir el modal en futuras navegaciones
        window.history.replaceState(null, '', location.pathname);
      }
    }
  }, [location.state, data, isFetching]);

  // Guardar datos cuando se cargan exitosamente
  React.useEffect(() => {
    if (!isFetching && data && data !== INITIAL_GUARD_DATA) {
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

  const toggleSort = (field: keyof Guard | string) => {
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
        isPageLoading={shouldShowLoading}
        initialShiftGuard={initialShiftGuard}
        onInitialShiftModalClose={() => setInitialShiftGuard(null)}
      />
    </div>
  );
}
