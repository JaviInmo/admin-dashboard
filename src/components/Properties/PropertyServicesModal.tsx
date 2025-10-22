"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import ServicesTable from "@/components/Services/ServiceTable";
import { listServicesByProperty, SERVICES_KEY } from "@/lib/services/services";
import type { Service } from "@/components/Services/types";
import { useI18n } from "@/i18n";
import { generateSort } from "@/lib/sort";
import type { SortOrder } from "@/lib/sort";
import { usePageSize } from "@/hooks/use-page-size";
import type { PaginatedResult } from "@/lib/pagination";

interface PropertyServicesModalProps {
  propertyId: number;
  propertyName?: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

function mapServiceSortField(field: keyof Service | string): string {
  switch (field) {
    case "name":
      return "name";
    case "guardName":
      return "guard__user__first_name";
    case "propertyName":
      return "assigned_property__name";
    case "recurrent":
      return "recurrent";
    default:
      return String(field);
  }
}

export default function PropertyServicesModal({ propertyId, propertyName, open, onClose, onUpdated }: PropertyServicesModalProps) {
  const { TEXT } = useI18n();
  const qc = useQueryClient();
  const { pageSize, setPageSize } = usePageSize(`property-services-${propertyId}`);

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Service>("name");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

  React.useEffect(() => {
    if (!open) {
      // reset to defaults when closed
      setPage(1);
      setSearch("");
      setSortField("name");
      setSortOrder("asc");
    }
     
  }, [open]);

  const apiOrdering = React.useMemo(() => {
    const mapped = mapServiceSortField(sortField);
    return generateSort(mapped, sortOrder);
  }, [sortField, sortOrder]);

  const queryKey = React.useMemo(
    () => [SERVICES_KEY, "by-property", propertyId, search, page, pageSize, apiOrdering] as const,
    [propertyId, search, page, pageSize, apiOrdering],
  );

  const { data, isFetching, error } = useQuery<
    PaginatedResult<Service>,
    unknown,
    PaginatedResult<Service>,
    typeof queryKey
  >({
    queryKey,
    queryFn: async () => {
      return await listServicesByProperty(propertyId, page, search, pageSize, apiOrdering);
    },
    enabled: open === true,
    // keepPreviousData was removed for type compatibility; staleTime kept
    staleTime: 1000 * 60 * 1,
  });

  React.useEffect(() => {
    if (error) {
      const errMsg = typeof error === "string" ? error : error instanceof Error ? error.message : TEXT?.services?.errorLoading ?? "Error loading services";
      toast.error(errMsg);
    }
  }, [error, TEXT]);

  const servicesList: Service[] = (data?.items ?? []) as Service[];
  const computedTotalPages = React.useMemo(() => Math.max(1, Math.ceil((data?.count ?? 0) / pageSize)), [data?.count, pageSize]);

  React.useEffect(() => {
    if (!isFetching) {
      setStableTotalPages(computedTotalPages);
    }
  }, [computedTotalPages, isFetching]);

  const totalPages = (!isFetching && data?.count !== undefined) ? computedTotalPages : stableTotalPages;

  const toggleSort = React.useCallback((f: keyof Service | string) => {
    const field = f as keyof Service;
    if (sortField === field) setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  }, [sortField]);

  async function handleRefresh() {
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === SERVICES_KEY });
    if (onUpdated) onUpdated();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      {/* usamos size="xl" y limitamos max-w para que el dialog sea ancho pero no infinito */}
      <DialogContent size="xl" className="max-w-[1200px] w-full max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="text-base font-semibold pl-3">
              {TEXT?.services?.title ?? "Services"}{propertyName ? ` — ${propertyName}` : ""}
            </DialogTitle>
           {/*  <div className="text-xs text-muted-foreground">{data?.count ?? 0} items</div> */}
          </div>
        </DialogHeader>

        <div className="p-3">
          {/* shrinkToFit = true hace que la tabla se comprima (table-fixed + truncate) */}
          <ServicesTable
            services={servicesList}
            onRefresh={handleRefresh}
            serverSide={true}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            onSearch={(term) => { setSearch(term); setPage(1); }}
            toggleSort={toggleSort}
            sortField={sortField}
            sortOrder={sortOrder}
            isPageLoading={isFetching}
            // prefill create dialog with this property
            createInitialPropertyId={propertyId}
            createInitialPropertyLabel={propertyName ?? undefined}

            // ajustamos para que la tabla quepa en el dialog xl
            largeMode={false}
            shrinkToFit={true}
            compact={false}
            context="property"
            columnsConfig={{ showName: true, showGuard: true, showProperty: false }}
          />
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground pl-3">
              {TEXT?.pagination?.pageInfo?.replace?.("{current}", String(page)) ?? `Página ${page} de ${totalPages}`}
            </div>
            <div className="flex items-center gap-2 pr-3">
              <Button className="border-2 " variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
