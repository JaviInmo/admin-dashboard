// src/components/Guards/GuardsPage.tsx
"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import type { PaginatedResult } from "@/lib/pagination";
import { GUARDS_KEY, listGuards } from "@/lib/services/guard";
import type { SortOrder } from "@/lib/sort";
import GuardsTable from "./GuardsTable";
import type { Guard } from "./types";

const INITIAL_GUARD_DATA: PaginatedResult<Guard> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

export default function GuardsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Guard>("firstName");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");
  
  // Estado para mantener totalPages estable durante loading
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  const { data, isFetching, error } = useQuery<PaginatedResult<Guard>, unknown>({
    queryKey: [GUARDS_KEY, search, page, pageSize, sortField, sortOrder],
    queryFn: () => listGuards(page, search, pageSize, sortField, sortOrder),
    placeholderData: keepPreviousData,
    initialData: INITIAL_GUARD_DATA,
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

  const toggleSort = (field: keyof Guard) => {
    if (sortField === field) {
      // Si es el mismo campo, cambiar orden
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Si es un campo diferente, cambiar campo y empezar con asc
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Mostrar errores en toast
  React.useEffect(() => {
    if (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error instanceof Error 
        ? error.message 
        : 'Error al cargar guardias';
      
      toast.error(errorMessage);
    }
  }, [error]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Guardias</h2>

      <GuardsTable
        guards={data.items}
        onSelectGuard={(idOrGuard: number | Guard) => {
          void idOrGuard;
        }}
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
