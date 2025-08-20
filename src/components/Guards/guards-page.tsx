// src/components/Guards/GuardsPage.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
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

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  const query = useQuery<PaginatedResult<Guard>, unknown>({
    queryKey: [GUARDS_KEY, search, page, pageSize, sortField, sortOrder],
    queryFn: () => listGuards(page, search, pageSize, sortField, sortOrder),
    // placeholderData da una "forma" mientras carga; evita accesos a undefined
    placeholderData: INITIAL_GUARD_DATA,
    // <-- no incluyo `keepPreviousData` para evitar las sobrecargas que te daban error TS.
    // Si querés keepPreviousData, te muestro abajo cómo añadirlo correctamente.
  });

  // Garantizar a TS que `data` tiene la forma paginada
  const data = (query.data ?? INITIAL_GUARD_DATA) as PaginatedResult<Guard>;
  const isLoading = query.isLoading;
  const error = query.error ?? null;

  const totalPages = Math.max(1, Math.ceil((data.count ?? 0) / pageSize));

  const toggleSort = (field: keyof Guard) => {
    setSortField(field);
    setSortOrder((prev) => (field === sortField && prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Guardias</h2>

      {error && (
        <div className="rounded-lg border bg-card p-4 text-red-600">
          {String(error)}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p>Cargando guardias...</p>
        </div>
      )}

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
      />
    </div>
  );
}
