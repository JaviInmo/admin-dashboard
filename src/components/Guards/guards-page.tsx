"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type { PaginatedResult } from "@/lib/pagination";
import { listGuards, GUARDS_KEY } from "@/lib/services/guard";
import type { Guard } from "./types";
import GuardsTable from "./GuardsTable";
/* import GuardDetailsTable from "./GuardDetailsTable"; */

const INITIAL_GUARD_DATA: PaginatedResult<Guard> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

const getInitialPageSize = (): number => {
  if (typeof window === 'undefined') return 20;
  const saved = sessionStorage.getItem('guards-page-size');
  return saved ? parseInt(saved, 10) : 20;
};

export default function GuardsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [pageSize, setPageSize] = React.useState<number>(getInitialPageSize);

  const handlePageSizeChange = React.useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('guards-page-size', String(newSize));
    }
  }, []);

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  const query = useQuery<PaginatedResult<Guard>, string>({
    queryKey: [GUARDS_KEY, search, page, pageSize],
    queryFn: () => listGuards(page, search, pageSize),
  });

  // garantizar que `data` siempre sea del tipo PaginatedResult<Guard>
  const data = query.data ?? INITIAL_GUARD_DATA;
  const isLoading = query.isLoading;
  const error = query.error ?? null;

  // Backend siempre envía 20 elementos por página
  const totalPages = Math.max(1, Math.ceil((data.count ?? 0) / pageSize));

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
        // aceptamos number | Guard pero aquí no guardamos el id (no se usa en esta página)
        onSelectGuard={(idOrGuard: number | Guard) => {
          // noop — si en el futuro querés usar la selección, restaurá el estado y lo manejo
          void idOrGuard;
        }}
        onRefresh={() =>
          // invalidar todas las queries relacionadas con GUARDS_KEY (search/page variantes incl.)
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) && query.queryKey[0] === GUARDS_KEY,
          })
        }
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        pageSize={pageSize}
        onSearch={handleSearch}
        onPageSizeChange={handlePageSizeChange}
      />

     {/*  <GuardDetails selectedGuardId={selectedGuardId} /> */}
    </div>
  );
}
