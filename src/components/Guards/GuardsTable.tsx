// src/components/Guards/GuardsTable.tsx
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
import { Pencil, Trash, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Guard } from "./types";
import CreateGuardDialog from "./Create/Create";
import EditGuardDialog from "./Edit/Edit";
import DeleteGuardDialog from "./Delete/Delete";

// <-- IMPORT DEL SCROLLAREA de shadcn
import { ScrollArea } from "@/components/ui/scroll-area";

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
}: GuardsTableProps) {
  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [sortField, setSortField] = React.useState<keyof Guard>("firstName");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editGuard, setEditGuard] = React.useState<Guard | null>(null);
  const [deleteGuard, setDeleteGuard] = React.useState<Guard | null>(null);

  const itemsPerPage = pageSize ?? 5;

  // estilos y animación del search
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

  const localFilteredAndSorted = normalizedGuards
    .filter((g) => {
      const q = search.toLowerCase();
      return (
        (g.firstName ?? "").toLowerCase().includes(q) ||
        (g.lastName ?? "").toLowerCase().includes(q) ||
        (g.email ?? "").toLowerCase().includes(q) ||
        (g.phone ?? "").toLowerCase().includes(q) ||
        (g.ssn ?? "").toLowerCase().includes(q) ||
        (g.address ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const valA = (a[sortField] ?? "") as unknown as string;
      const valB = (b[sortField] ?? "") as unknown as string;
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

  const effectiveList = serverSide ? normalizedGuards : localFilteredAndSorted;
  const localTotalPages = Math.max(
    1,
    Math.ceil(localFilteredAndSorted.length / itemsPerPage),
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
  }, [search, serverSide]);

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
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

  const toggleSort = (field: keyof Guard) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (field: keyof Guard) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">Lista de Guardias</h3>
        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div
            className={`${highlightSearch ? "search-highlight search-pulse" : ""}`}
            style={{ minWidth: 280 }}
          >
            <Input
              ref={searchRef}
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label="Buscar guardias"
            />
          </div>
        </div>
        <div className="flex-none">
          <Button onClick={() => setCreateOpen(true)}>Agregar</Button>
        </div>
      </div>

      {/* SCROLL AREA envuelve la tabla: controla scroll vertical y horizontal */}
      <ScrollArea className="rounded-md border">
        {/* Ajusta max-h para controlar cuándo aparece el scroll vertical */}
        <div className="max-h-[48vh]">
          {/* Forzamos min-width para activar scroll horizontal si hace falta */}
          <div className="min-w-[900px]">
            <Table>
              {/* Si quieres que el header quede pegado dentro del ScrollArea,
                  puedes usar la clase sticky. A veces necesitas ajustar el z-index y background. */}
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead
                    onClick={() => toggleSort("firstName")}
                    className="cursor-pointer select-none"
                  >
                    Nombre {renderSortIcon("firstName")}
                  </TableHead>
                  <TableHead
                    onClick={() => toggleSort("lastName")}
                    className="cursor-pointer select-none"
                  >
                    Apellido {renderSortIcon("lastName")}
                  </TableHead>
                  <TableHead
                    onClick={() => toggleSort("email")}
                    className="cursor-pointer select-none"
                  >
                    Correo {renderSortIcon("email")}
                  </TableHead>
                  <TableHead className="w-[140px]">Teléfono</TableHead>
                  <TableHead className="w-[120px]">DNI/SSN</TableHead>
                  <TableHead className="w-[140px]">Fecha Nac.</TableHead>
                  <TableHead className="w-[100px] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGuards.map((g, idx) => (
                  <TableRow
                    key={g.id}
                    className={`cursor-pointer hover:bg-muted ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"}`}
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
                        <span>{g.firstName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{g.lastName}</TableCell>
                    <TableCell>{g.email}</TableCell>
                    <TableCell>{g.phone}</TableCell>
                    {/* SSN oculto */}
                    <TableCell>******</TableCell>
                    <TableCell>{g.birthdate}</TableCell>
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

      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => goToPage(effectivePage - 1)}
                className={effectivePage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: effectiveTotalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={effectivePage === i + 1}
                  onClick={() => goToPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => goToPage(effectivePage + 1)}
                className={effectivePage === effectiveTotalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <CreateGuardDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editGuard && <EditGuardDialog guard={editGuard} onClose={() => setEditGuard(null)} onUpdated={onRefresh} />}
      {deleteGuard && <DeleteGuardDialog guard={deleteGuard} onClose={() => setDeleteGuard(null)} onDeleted={onRefresh} />}
    </div>
  );
}
