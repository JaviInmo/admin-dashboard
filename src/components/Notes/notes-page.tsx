// src/components/Notes/notes-page.tsx
"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginatedResult } from "@/lib/pagination";
import { listNotes, NOTES_KEY } from "@/lib/services/notes";
import type { Note } from "./type";
import type { SortOrder } from "@/lib/sort";
import { generateSort } from "@/lib/sort";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { usePageSize } from "@/hooks/use-page-size";
import { useVisitedPagesCache } from "@/hooks/use-visited-pages-cache";
import NotesTable from "./NotesTable";

const INITIAL_NOTES_DATA: PaginatedResult<Note> = {
  items: [],
  count: 0,
  next: null,
  previous: null,
};

/** Mapea keys del frontend a los campos que entiende DRF */
function mapNoteSortField(field?: keyof Note | string): string | undefined {
  switch (field) {
    case "name":
      return "name";
    case "amount":
      return "amount";
    case "created_at":
      return "created_at";
    case "updated_at":
      return "updated_at";
    default:
      return typeof field === "string" ? field : undefined;
  }
}

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { TEXT } = useI18n();
  const { pageSize, setPageSize } = usePageSize("notes");
  const visitedCache = useVisitedPagesCache<PaginatedResult<Note>>();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Note>("name");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

  // Mantener totalPages estable durante loading
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  const apiOrdering = React.useMemo(() => {
    const mapped = mapNoteSortField(sortField);
    return generateSort(mapped, sortOrder); // string | undefined
  }, [sortField, sortOrder]);

  // MEMOIZE queryKey to avoid changing identity on every render (fixes react-hooks/exhaustive-deps)
  const queryKey = React.useMemo(
    () => [NOTES_KEY, search, page, pageSize, apiOrdering] as const,
    [search, page, pageSize, apiOrdering],
  );

  const { data = INITIAL_NOTES_DATA, isFetching, error } =
    useQuery<PaginatedResult<Note>, unknown, PaginatedResult<Note>>({
      queryKey,
      queryFn: () => listNotes(page, search, pageSize, apiOrdering),
      initialData: INITIAL_NOTES_DATA,
      placeholderData: (previousData) => {
        const cached = visitedCache.get(queryKey);
        if (cached) {
          const maxPage = Math.max(1, Math.ceil(cached.count / pageSize));
          if (page <= maxPage) return cached;
        }
        return previousData ?? INITIAL_NOTES_DATA;
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
    if (!isFetching && data && data !== INITIAL_NOTES_DATA) {
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

  const toggleSort = (field: keyof Note) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleSearch = React.useCallback((term: string) => {
    setPage(1);
    setSearch(term);
  }, []);

  React.useEffect(() => {
    if (error) {
      const errMsg =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : "Error loading notes";
      toast.error(errMsg);
    }
     
  }, [error]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{TEXT.menu?.notes ?? "Notes"}</h2>

      <NotesTable
        notes={data?.items ?? []}
        onRefresh={() =>
          queryClient.invalidateQueries({
            predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === NOTES_KEY,
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
      />
    </div>
  );
}
