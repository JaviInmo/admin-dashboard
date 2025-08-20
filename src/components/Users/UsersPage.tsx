"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { PaginatedResult } from "@/lib/pagination";
import { listUsers, USER_KEY } from "@/lib/services/users";
import type { SortOrder } from "@/lib/sort";
import type { User } from "./types";
import UsersTable from "./UsersTable";
/* import UserPermissionsTable from "./UserPermissionsTable"; */
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

  const { data, isPending, error } = useQuery<PaginatedResult<User>, string>({
    queryKey: [USER_KEY, search, page, pageSize, sortField, sortOrder],
    queryFn: () => listUsers(page, search, pageSize, sortField, sortOrder),
    placeholderData: keepPreviousData,
    initialData: INITIAL_USER_DATA,
  });

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));
  const [, setSelectedUserId] = React.useState<number | null>(null);

  const toggleSort = (field: keyof User) => {
    if (sortField === field) {
      // Si es el mismo campo, cambiar orden
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Si es un campo diferente, cambiar campo y empezar con asc
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{TEXT.users?.title ?? "Gestión de Usuarios"}</h2>

      {error && <div className="rounded-lg border bg-card p-4 text-red-600">{String(error)}</div>}


      {isPending && (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm flex flex-col gap-2">
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-full mb-2" />
          <p>{TEXT.users?.loading ?? "Cargando usuarios..."}</p>
        </div>
      )}

      <UsersTable
        users={data?.items ?? []}
        onSelectUser={(id) => setSelectedUserId(id)}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: [USER_KEY] })}
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(page) => setPage(page)}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearch={(term) => setSearch(term)}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
      />

     {/*  <UserPermisions selectedUserId={selectedUserId} /> */}
    </div>
  );
}
/* 
function UserPermisions({ selectedUserId }: Readonly<{ selectedUserId: number | null }>) {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();

  const { data } = useQuery({
    queryKey: [USER_KEY, selectedUserId],
    queryFn: () => getUser(selectedUserId ?? 0),
    enabled: selectedUserId != null,
  });

  if (!data) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">{TEXT.users?.selectPrompt ?? "Selecciona un usuario para ver y editar sus permisos."}</p>
      </div>
    );
  }

  const userLabel = data.username ?? data.name ?? `#${data.id}`;
  return (
    <UserPermissionsTable
      userId={data.id}
      userLabel={userLabel}
      onUpdated={() => queryClient.invalidateQueries({ queryKey: [USER_KEY] })}
    />
  );
}
 */