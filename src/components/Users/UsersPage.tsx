"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginatedResult } from "@/lib/pagination";
import { listUsers, USER_KEY } from "@/lib/services/users";
import type { SortOrder } from "@/lib/sort";
import type { User } from "./types";
import UsersTable from "./UsersTable";
import { useI18n } from "@/i18n";
import { useVisitedPagesCache } from "@/hooks/use-visited-pages-cache";

const INITIAL_USER_DATA: PaginatedResult<User> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

const DEFAULT_PAGE_SIZE = 10;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();
  const visitedCache = useVisitedPagesCache<PaginatedResult<User>>();

  const [page, setPage] = React.useState<number>(1);
  const [pageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof User>("username");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  // Generar queryKey para el caché
  const queryKey = [USER_KEY, search, page, pageSize, sortField, sortOrder];

  // Nota: declaro los genéricos para que TS sepa qué tipo devuelve `data`
  const { data, isFetching, error } = useQuery<PaginatedResult<User>, Error>({
    queryKey,
    queryFn: () => listUsers(page, search, pageSize, sortField, sortOrder),
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
      return previousData || INITIAL_USER_DATA;
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
    if (!isFetching && data && data !== INITIAL_USER_DATA) {
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

  // Datos seguros (fallback)
  const usersData = data ?? INITIAL_USER_DATA;
  const totalPages = Math.max(1, Math.ceil((usersData.count ?? 0) / pageSize));

  // Verificar si la página actual es mayor que el total y ajustar
  React.useEffect(() => {
    if (!isFetching && totalPages > 0 && page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages, isFetching]);
  const [, setSelectedUserId] = React.useState<number | null>(null);

  const toggleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    // al cambiar sort normalmente quieres volver a la página 1
    setPage(1);
  };

  const errorMessage = React.useMemo(() => {
    if (!error) return null;
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }, [error]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{TEXT.users?.title ?? "Gestión de Usuarios"}</h2>

      {errorMessage && (
        <div className="rounded-lg border bg-card p-4 text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Skeleton de cabecera mientras hace fetching */}
      {shouldShowLoading && (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm flex flex-col gap-2">
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <p>{TEXT.users?.loading ?? "Cargando usuarios..."}</p>
        </div>
      )}

      <UsersTable
        users={usersData.items ?? []}
        onSelectUser={(id) => setSelectedUserId(id)}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: [USER_KEY] })}
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        pageSize={pageSize}
        onSearch={(term) => {
          setSearch(term);
          setPage(1);
        }}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
      />
    </div>
  );
}
