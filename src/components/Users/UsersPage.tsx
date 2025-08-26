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

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof User>("username");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  // Nota: declaro los genéricos para que TS sepa qué tipo devuelve `data`
  const { data, isFetching, error } = useQuery<PaginatedResult<User>, Error>({
    queryKey: [USER_KEY, search, page, pageSize, sortField, sortOrder],
    queryFn: () => listUsers(page, search, pageSize, sortField, sortOrder),
    // Si quieres keepPreviousData, dímelo y lo reintroduzco según la versión de react-query
    // keepPreviousData: true,
  });

  // Datos seguros (fallback)
  const usersData = data ?? INITIAL_USER_DATA;
  const totalPages = Math.max(1, Math.ceil((usersData.count ?? 0) / pageSize));
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
      {isFetching && (
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
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearch={(term) => {
          setSearch(term);
          setPage(1);
        }}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
        isLoading={isFetching}
      />
    </div>
  );
}
