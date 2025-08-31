import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect } from "react";
import type { PaginatedResult } from "@/lib/pagination";

export interface UsePaginatedQueryOptions<T> {
  // Función que hace la query al API
  queryFn: (page: number, search: string, pageSize: number, ordering?: string) => Promise<PaginatedResult<T>>;
  // Base key para las queries (ej: "clients", "guards", etc.)
  queryKey: string;
  // Configuración inicial
  initialPageSize?: number;
  // Cache adicional por tiempo (default: 5 minutos)
  staleTime?: number;
  // Función de mapeo de sort field si es necesario
  mapSortField?: (field: string) => string | undefined;
}

export function usePaginatedQuery<T, SortField extends string = string>({
  queryFn,
  queryKey,
  initialPageSize = 10,
  staleTime = 5 * 60 * 1000, // 5 minutos por defecto
  mapSortField,
}: UsePaginatedQueryOptions<T>) {
  const queryClient = useQueryClient();
  
  // Estados de paginación
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [sortField, setSortField] = useState<SortField | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Estados para estabilidad durante loading
  const [stableTotalPages, setStableTotalPages] = useState<number>(1);
  
  // Generar ordering string para el API
  const apiOrdering = useMemo(() => {
    if (!sortField) return undefined;
    const mapped = mapSortField ? mapSortField(sortField) : sortField;
    if (!mapped) return undefined;
    return sortOrder === "desc" ? `-${mapped}` : mapped;
  }, [sortField, sortOrder, mapSortField]);

  // Query principal con caché inteligente
  const {
    data,
    isFetching,
    error,
    isLoading,
  } = useQuery<PaginatedResult<T>>({
    queryKey: [queryKey, search, page, pageSize, apiOrdering],
    queryFn: () => queryFn(page, search, pageSize, apiOrdering),
    staleTime,
    // Mantener datos anteriores mientras carga nuevos (smooth UX)
    placeholderData: (previousData) => previousData,
  });

  const safeData = data ?? { items: [], count: 0, next: null, previous: null };

  // Effect para prefetch de páginas adyacentes
  useEffect(() => {
    if (!data || isFetching) return;
    
    const totalPagesCount = Math.ceil(data.count / pageSize);
    
    // Prefetch página siguiente si existe
    if (data.next && page < totalPagesCount) {
      queryClient.prefetchQuery({
        queryKey: [queryKey, search, page + 1, pageSize, apiOrdering],
        queryFn: () => queryFn(page + 1, search, pageSize, apiOrdering),
        staleTime,
      });
    }
    
    // Prefetch página anterior si existe
    if (data.previous && page > 1) {
      queryClient.prefetchQuery({
        queryKey: [queryKey, search, page - 1, pageSize, apiOrdering],
        queryFn: () => queryFn(page - 1, search, pageSize, apiOrdering),
        staleTime,
      });
    }
  }, [data, isFetching, page, pageSize, queryClient, queryKey, search, apiOrdering, queryFn, staleTime]);

  // Calcular total de páginas con estabilidad
  const totalPages = useMemo(() => {
    const newTotalPages = Math.max(1, Math.ceil((safeData.count ?? 0) / pageSize));
    
    if (!isFetching && safeData.count !== undefined) {
      setStableTotalPages(newTotalPages);
      return newTotalPages;
    }
    
    return stableTotalPages;
  }, [safeData.count, isFetching, stableTotalPages, pageSize]);

  // Handlers
  const handleSearch = useCallback((term: string) => {
    setSearch(term);
    setPage(1); // Reset a página 1 cuando se busca
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset a página 1 cuando cambia el tamaño
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1); // Reset a página 1 cuando cambia el sort
  }, [sortField]);

  // Función para invalidar el caché (refresh)
  const invalidateQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === queryKey
    });
  }, [queryClient, queryKey]);

  // Función para prefetch manual de páginas específicas
  const prefetchPage = useCallback(async (targetPage: number) => {
    await queryClient.prefetchQuery({
      queryKey: [queryKey, search, targetPage, pageSize, apiOrdering],
      queryFn: () => queryFn(targetPage, search, pageSize, apiOrdering),
      staleTime,
    });
  }, [queryClient, queryKey, search, pageSize, apiOrdering, queryFn, staleTime]);

  // Estado de la página cached
  const isPageCached = useCallback((targetPage: number) => {
    const query = queryClient.getQueryData([queryKey, search, targetPage, pageSize, apiOrdering]);
    return !!query;
  }, [queryClient, queryKey, search, pageSize, apiOrdering]);

  return {
    // Datos
    data: safeData.items,
    count: safeData.count,
    totalPages,
    
    // Estados de paginación
    page,
    pageSize,
    search,
    sortField,
    sortOrder,
    
    // Estados de loading
    isLoading,
    isFetching,
    error,
    
    // Handlers
    handleSearch,
    handlePageChange,
    handlePageSizeChange,
    handleSort,
    
    // Utilidades
    invalidateQueries,
    prefetchPage,
    isPageCached,
  };
}
