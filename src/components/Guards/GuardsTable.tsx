"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import { cn } from "@/lib/utils";
import { shouldShowPage } from "../_utils/pagination";
import CreateGuardDialog from "./Create/Create";
import DeleteGuardDialog from "./Delete/Delete";
import EditGuardDialog from "./Edit/Edit";
import type { Guard } from "./types";
import PageSizeSelector from "@/components/ui/PageSizeSelector";
import { ClickableEmail } from "../ui/clickable-email";

export interface GuardsTableProps {
  guards: Guard[];
  onSelectGuard: (id: number) => void;
  onRefresh?: () => Promise<void>;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onSearch?: (term: string) => void;
  onPageSizeChange?: (size: number) => void;

  sortField: keyof Guard;
  sortOrder: SortOrder;
  toggleSort: (key: keyof Guard) => void;
}

export default function GuardsTable({
  guards,
  onSelectGuard,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onSearch,
  onPageSizeChange,

  sortField,
  sortOrder,
  toggleSort,
}: GuardsTableProps) {
  const { TEXT } = useI18n();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editGuard, setEditGuard] = React.useState<Guard | null>(null);
  const [deleteGuard, setDeleteGuard] = React.useState<Guard | null>(null);

  const itemsPerPage = pageSize ?? 5;

  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (searchRef.current) {
      try {
        searchRef.current.focus();
      } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const normalizedGuards = guards.map((g) => ({
    ...g,
    firstName: g.firstName ?? "",
    lastName: g.lastName ?? "",
    email: g.email ?? "",
    phone: g.phone ?? "",
    ssn: g.ssn ?? "",
    address: g.address ?? "",
    birthdate: g.birthdate ?? "",
  })) as Guard[];

  const localFilteredAndSorted = normalizedGuards.filter((g) => {
    const q = (search ?? "").toLowerCase();
    if (!q) return true;
    return (
      (g.firstName ?? "").toLowerCase().includes(q) ||
      (g.lastName ?? "").toLowerCase().includes(q) ||
      (g.email ?? "").toLowerCase().includes(q) ||
      (g.phone ?? "").toLowerCase().includes(q) ||
      (g.ssn ?? "").toLowerCase().includes(q) ||
      (g.address ?? "").toLowerCase().includes(q)
    );
  });

  const effectiveList = serverSide ? normalizedGuards : localFilteredAndSorted;
  const localTotalPages = Math.max(
    1,
    Math.ceil(localFilteredAndSorted.length / itemsPerPage)
  );
  const effectiveTotalPages = serverSide
    ? Math.max(1, totalPages ?? 1)
    : localTotalPages;
  const effectivePage = serverSide
    ? Math.max(1, Math.min(currentPage, effectiveTotalPages))
    : page;
  const startIndex = (effectivePage - 1) * itemsPerPage;
  const paginatedGuards = serverSide
    ? effectiveList
    : effectiveList.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    if (!serverSide) setPage(1);
  }, [search, serverSide, guards.length]);

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  React.useEffect(() => {
    if (!serverSide) return;
    if (!onSearch) return;
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    searchTimerRef.current = setTimeout(() => {
      onSearch(search);
    }, 350);
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [search, serverSide, onSearch]);

  const goToPage = (p: number) => {
    const newP = Math.max(1, Math.min(effectiveTotalPages, p));
    if (serverSide) onPageChange?.(newP);
    else setPage(newP);
  };

  const renderSortIcon = (field: keyof Guard) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  // --- Access i18n keys from your files: TEXT.guards.table.*
  const guardTable =
    (TEXT.guards && (TEXT.guards as any).table) ?? (TEXT.guards as any) ?? {};

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">
          {guardTable.title ?? "Guards List"}
        </h3>

        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div
            className={`${
              highlightSearch ? "search-highlight search-pulse" : ""
            }`}
            style={{ minWidth: 280 }}
          >
            <Input
              ref={searchRef}
              placeholder={guardTable.searchPlaceholder ?? "Buscar..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label={guardTable.searchPlaceholder ?? "Buscar guardias"}
            />
          </div>
        </div>

        <div className="flex-none mr-2">
          <PageSizeSelector
            pageSize={pageSize}
            onChange={(s) => {
              onPageSizeChange?.(s);
              if (!serverSide) setPage(1);
            }}
            ariaLabel={guardTable.pageSizeLabel ?? "Items per page"}
          />
        </div>

        <div className="flex-none">
          <Button onClick={() => setCreateOpen(true)}>
            {guardTable.add ?? "Agregar"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <ScrollArea className="rounded-md border">
          <div className="max-h-[60vh] ">
            <div className="min-w-[900px]">
              <Table className="table-fixed w-full">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead
                      onClick={() => toggleSort("firstName")}
                      className="cursor-pointer select-none"
                    >
                      {guardTable.headers?.name ?? "Nombre"}{" "}
                      {renderSortIcon("firstName")}
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort("lastName")}
                      className="cursor-pointer select-none"
                    >
                      {guardTable.headers?.lastName ?? "Apellido"}{" "}
                      {renderSortIcon("lastName")}
                    </TableHead>
                    <TableHead
                      onClick={() => toggleSort("email")}
                      className="cursor-pointer select-none"
                    >
                      {guardTable.headers?.email ?? "Correo"}{" "}
                      {renderSortIcon("email")}
                    </TableHead>
                    <TableHead className="w-[140px]">
                      {guardTable.headers?.phone ?? "Teléfono"}
                    </TableHead>
                    <TableHead className="w-[120px]">
                      {guardTable.headers?.ssn ?? "DNI/SSN"}
                    </TableHead>
                    <TableHead className="w-[140px]">
                      {guardTable.headers?.birthdate ?? "Fecha Nac."}
                    </TableHead>
                    <TableHead className="w-[100px] text-center">
                      {guardTable.headers?.actions ?? "Acciones"}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedGuards.map((g, idx) => (
                    <TableRow
                      key={g.id}
                      className={`cursor-pointer hover:bg-muted ${
                        idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                      }`}
                      onClick={() => onSelectGuard(g.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectGuard(g.id);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="w-full">
                          <span>{g.firstName || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{g.lastName || "-"}</TableCell>
                      <TableCell>
                        <ClickableEmail email={g.email || ""} />
                      </TableCell>
                      <TableCell>{g.phone || "-"}</TableCell>
                      <TableCell>{guardTable.ssnHidden ?? "******"}</TableCell>
                      <TableCell>{g.birthdate || "-"}</TableCell>
                      <TableCell className="flex gap-2 justify-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditGuard(g);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteGuard(g);
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => goToPage(effectivePage - 1)}
                className={cn(
                  effectivePage === 1 
                    ? "pointer-events-none opacity-50 cursor-not-allowed" 
                    : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                )}
              />
            </PaginationItem>

            {Array.from({ length: effectiveTotalPages }, (_, i) => i)
              .filter((item) =>
                shouldShowPage(item + 1, effectivePage, effectiveTotalPages)
              )
              .map((item) => (
                <PaginationItem key={item}>
                  <PaginationLink
                    isActive={effectivePage === item + 1}
                    onClick={() => goToPage(item + 1)}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {item + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => goToPage(effectivePage + 1)}
                className={cn(
                  effectivePage === effectiveTotalPages
                    ? "pointer-events-none opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <CreateGuardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onRefresh}
      />
      {editGuard && (
        <EditGuardDialog
          guard={editGuard}
          onClose={() => setEditGuard(null)}
          onUpdated={onRefresh}
        />
      )}
      {deleteGuard && (
        <DeleteGuardDialog
          guard={deleteGuard}
          onClose={() => setDeleteGuard(null)}
          onDeleted={onRefresh}
        />
      )}
    </div>
  );
}
