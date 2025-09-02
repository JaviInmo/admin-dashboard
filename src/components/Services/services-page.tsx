"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import type { PaginatedResult } from "@/lib/pagination";
import { SERVICES_KEY, listServices } from "@/lib/services/services";
import type { SortOrder } from "@/lib/sort";
import { generateSort } from "@/lib/sort";
import ServicesTable from "./ServiceTable";
import type { Service } from "./types";
import { useI18n } from "@/i18n";
import { usePageSize } from "@/hooks/use-page-size";
import { useVisitedPagesCache } from "@/hooks/use-visited-pages-cache";
import CreateServiceDialog from "./Create/Create";

function mapServiceSortField(field: keyof Service): string {
  switch (field) {
    case "name":
      return "name";
    case "guardName":
      return "guard__user__first_name"; // example: adjust if your API expects user__first_name
    case "propertyName":
      return "assigned_property__name"; // adjust to API field if needed
    default:
      return String(field);
  }
}

const INITIAL_DATA: PaginatedResult<Service> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();
  const { pageSize, setPageSize } = usePageSize("services");

  const visitedCache = useVisitedPagesCache<PaginatedResult<Service>>();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Service>("name");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);
  const [createOpen, setCreateOpen] = React.useState(false);

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  const apiOrdering = React.useMemo(() => {
    const mapped = mapServiceSortField(sortField);
    return generateSort(mapped, sortOrder);
  }, [sortField, sortOrder]);

  const queryKey = [SERVICES_KEY, search, page, pageSize, apiOrdering];

  const {
    data = INITIAL_DATA,
    isFetching,
    error,
  } = useQuery<PaginatedResult<Service>, unknown, PaginatedResult<Service>>({
    queryKey,
    queryFn: () => listServices(page, search, pageSize, apiOrdering),
    initialData: INITIAL_DATA,
    placeholderData: (previousData) => {
      const cached = visitedCache.get(queryKey);
      if (cached) {
        const maxPage = Math.max(1, Math.ceil(cached.count / pageSize));
        if (page <= maxPage) return cached;
      }
      return previousData || INITIAL_DATA;
    },
    refetchOnMount: () => {
      const cached = visitedCache.get(queryKey);
      if (cached) {
        const maxPage = Math.max(1, Math.ceil(cached.count / pageSize));
        return page > maxPage;
      }
      return true;
    },
  });

  React.useEffect(() => {
    if (!isFetching && data && data !== INITIAL_DATA) {
      visitedCache.set(queryKey, data);
    }
  }, [data, isFetching, queryKey, visitedCache]);

  const shouldShowLoading = isFetching && (() => {
    const cached = visitedCache.get(queryKey);
    if (cached) {
      const maxPage = Math.max(1, Math.ceil(cached.count / pageSize));
      return page > maxPage;
    }
    return true;
  })();

  const totalPages = React.useMemo(() => {
    const newTotal = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));
    if ((!isFetching && data?.count !== undefined) || stableTotalPages === 1) {
      setStableTotalPages(newTotal);
      return newTotal;
    }
    return stableTotalPages;
  }, [data?.count, isFetching, stableTotalPages, pageSize]);

  React.useEffect(() => {
    if (!isFetching && totalPages > 0 && page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages, isFetching]);

  const toggleSort = (field: keyof Service) => {
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
      const errMsg = typeof error === "string" ? error : error instanceof Error ? error.message : TEXT?.services?.errorLoading ?? "Error loading services";
      toast.error(errMsg);
    }
  }, [error, TEXT]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{TEXT?.services?.title ?? "Services"}</h2>

      <ServicesTable
        services={data.items}
        onRefresh={() =>
          queryClient.invalidateQueries({
            predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === SERVICES_KEY,
          })
        }
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        pageSize={pageSize}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onSearch={handleSearch}
        toggleSort={toggleSort}
        sortField={sortField}
        sortOrder={sortOrder}
        isPageLoading={shouldShowLoading}
      />

      <CreateServiceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === SERVICES_KEY });
        }}
      />
    </div>
  );
}
