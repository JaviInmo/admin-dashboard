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

function mapServiceSortField(field: keyof Service): string {
  switch (field) {
    case "name":
      return "name";
    case "guardName":
      return "guard__user__first_name";
    case "propertyName":
      return "assigned_property__name";
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

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  const apiOrdering = React.useMemo(() => {
    const mapped = mapServiceSortField(sortField);
    return generateSort(mapped, sortOrder);
  }, [sortField, sortOrder]);

  const queryKey = React.useMemo(() => [SERVICES_KEY, search, page, pageSize, apiOrdering], [search, page, pageSize, apiOrdering]);

  // Decide whether to refetch on mount depending on cached pages (React Query expects a boolean)
  const cachedForKey = React.useMemo(() => visitedCache.get(queryKey), [visitedCache, queryKey, pageSize]);
  const refetchOnMount = React.useMemo(() => {
    if (!cachedForKey) return true;
    const maxPage = Math.max(1, Math.ceil((cachedForKey.count ?? 0) / pageSize));
    return page > maxPage;
  }, [cachedForKey, page, pageSize]);

  const {
    data = INITIAL_DATA,
    isFetching,
    error,
  } = useQuery<PaginatedResult<Service>, unknown, PaginatedResult<Service>>({
    queryKey,
    queryFn: () => listServices(page, search, pageSize, apiOrdering),
    initialData: INITIAL_DATA,
    placeholderData: (previousData?: PaginatedResult<Service>) => {
      if (!previousData || previousData === INITIAL_DATA) {
        // try visited cache
        if (cachedForKey) {
          const maxPage = Math.max(1, Math.ceil((cachedForKey.count ?? 0) / pageSize));
          if (page <= maxPage) return cachedForKey;
        }
        return previousData ?? INITIAL_DATA;
      }
      return previousData;
    },
    // boolean (not a function) — computed above
    refetchOnMount,
  });

  React.useEffect(() => {
    if (!isFetching && data && data !== INITIAL_DATA) {
      visitedCache.set(queryKey, data);
    }
  }, [data, isFetching, queryKey, visitedCache]);

  const shouldShowLoading = React.useMemo(() => {
    if (!isFetching) return false;
    if (cachedForKey) {
      const maxPage = Math.max(1, Math.ceil((cachedForKey.count ?? 0) / pageSize));
      return page > maxPage;
    }
    return true;
  }, [isFetching, cachedForKey, page, pageSize]);

  // compute pages (pure)
  const computedTotalPages = React.useMemo(() => {
    return Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));
  }, [data?.count, pageSize]);

  // keep a stable value while fetching (avoid page jump)
  React.useEffect(() => {
    if (!isFetching) {
      setStableTotalPages(computedTotalPages);
    }
  }, [computedTotalPages, isFetching]);

  const totalPages = (!isFetching && data?.count !== undefined) ? computedTotalPages : stableTotalPages;

  React.useEffect(() => {
    if (!isFetching && totalPages > 0 && page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages, isFetching]);

  const toggleSort = React.useCallback((field: keyof Service) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  }, [sortField]);

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
    </div>
  );
}
