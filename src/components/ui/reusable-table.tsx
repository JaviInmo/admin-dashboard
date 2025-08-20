"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReusablePagination } from "@/components/ui/reusable-pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SortOrder } from "@/lib/sort";
import PageSizeSelector from "@/components/ui/PageSizeSelector";

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string; // Ancho fijo específico (ej: "150px", "20%")
  minWidth?: string; // Ancho mínimo (ej: "100px")
  maxWidth?: string; // Ancho máximo (ej: "300px")
  autoSize?: boolean; // Si debe ajustarse automáticamente al contenido
  flex?: number; // Factor de crecimiento flex (1, 2, etc.)
  className?: string;
}

export interface ReusableTableProps<T> {
  // Datos
  data: T[];
  columns: Column<T>[];
  
  // Identificación y selección
  getItemId: (item: T) => number | string;
  onSelectItem?: (id: number | string) => void;
  
  // Configuración de tabla
  title: string;
  searchPlaceholder?: string;
  addButtonText?: string;
  onAddClick?: () => void;
  
  // Paginación
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  
  // Búsqueda
  onSearch?: (term: string) => void;
  searchFields?: (keyof T)[];
  
  // Sorting
  sortField?: keyof T;
  sortOrder?: SortOrder;
  toggleSort?: (field: keyof T) => void;
  
  // Acciones de fila
  actions?: (item: T) => React.ReactNode;
  
  // Callbacks
  onRefresh?: () => Promise<void>;
  
  // Customización
  className?: string;
}

export function ReusableTable<T extends Record<string, any>>({
  data,
  columns,
  getItemId,
  onSelectItem,
  title,
  searchPlaceholder = "Buscar...",
  addButtonText = "Agregar",
  onAddClick,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onPageSizeChange,
  onSearch,
  searchFields = [],
  sortField,
  sortOrder = "asc",
  toggleSort,
  actions,
  className = "",
}: ReusableTableProps<T>) {
  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  const itemsPerPage = pageSize ?? 5;

  // Función helper para calcular estilos de columna
  const getColumnStyle = (column: Column<T>, columnIndex: number) => {
    const styles: React.CSSProperties = {};
    
    if (column.width) {
      // Si tiene ancho fijo, usarlo directamente
      styles.width = column.width;
    } else if (columnIndex === 2) {
      // La columna de dirección (índice 2) toma el espacio restante
      styles.width = 'auto';
      styles.maxWidth = '1px'; // Trick para que se expanda pero se pueda truncar
      styles.overflow = 'hidden';
      styles.textOverflow = 'ellipsis';
      styles.whiteSpace = 'nowrap';
    } else {
      // Otras columnas: ancho mínimo para su contenido
      styles.width = '1px';
      styles.whiteSpace = 'nowrap';
    }
    
    return styles;
  };

  // Función helper para clases CSS de columna
  const getColumnClasses = (column: Column<T>) => {
    let classes = column.className || "";
    
    if (column.sortable && toggleSort) {
      classes += " cursor-pointer select-none";
    }
    
    return classes.trim();
  };

  // Focus en búsqueda al montar
  React.useEffect(() => {
    if (searchRef.current) {
      try {
        searchRef.current.focus();
      } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // Filtrado local
  const localFiltered = data.filter((item) => {
    const q = (search ?? "").toLowerCase();
    if (!q) return true;
    
    return searchFields.some(field => {
      const value = item[field];
      return String(value ?? "").toLowerCase().includes(q);
    });
  });

  // Paginación
  const effectiveList = serverSide ? data : localFiltered;
  const localTotalPages = Math.max(1, Math.ceil(localFiltered.length / itemsPerPage));
  const effectiveTotalPages = serverSide ? Math.max(1, totalPages ?? 1) : localTotalPages;
  const effectivePage = serverSide ? Math.max(1, Math.min(currentPage, effectiveTotalPages)) : page;
  const startIndex = (effectivePage - 1) * itemsPerPage;
  const paginatedData = serverSide ? effectiveList : effectiveList.slice(startIndex, startIndex + itemsPerPage);

  // Reset página local cuando cambia búsqueda
  React.useEffect(() => {
    if (!serverSide) setPage(1);
  }, [search, serverSide, data.length]);

  // Búsqueda con debounce para server-side
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const renderSortIcon = (field: keyof T) => {
    if (!toggleSort) return null;
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
    return sortOrder === "asc" ? 
      <ArrowUp className="ml-1 h-3 w-3 inline" /> : 
      <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  return (
    <div className={`rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">{title}</h3>

        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div className={`${highlightSearch ? "search-highlight search-pulse" : ""}`} style={{ minWidth: 280 }}>
            <Input
              ref={searchRef}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label={searchPlaceholder}
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
            ariaLabel="Items per page"
          />
        </div>

        {onAddClick && (
          <div className="flex-none">
            <Button onClick={onAddClick}>{addButtonText}</Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <ScrollArea className="rounded-md border">
          <div className="max-h-[60vh] w-full">
            <Table className="w-full">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead
                      key={String(column.key)}
                      onClick={column.sortable && toggleSort ? () => toggleSort(column.key) : undefined}
                      className={getColumnClasses(column)}
                      style={getColumnStyle(column, index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={index === 2 ? "truncate" : ""}>{column.label}</span>
                        {column.sortable && renderSortIcon(column.key)}
                      </div>
                    </TableHead>
                  ))}
                  {actions && (
                    <TableHead 
                      className="text-center"
                      style={{ width: '1px', whiteSpace: 'nowrap' }}
                    >
                      Acciones
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.map((item, rowIdx) => (
                  <TableRow
                    key={String(getItemId(item))}
                    className={`cursor-pointer hover:bg-muted ${rowIdx % 2 === 0 ? "bg-transparent" : "bg-muted/5"}`}
                    onClick={() => onSelectItem?.(getItemId(item))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectItem?.(getItemId(item));
                      }
                    }}
                  >
                    {columns.map((column, colIndex) => (
                      <TableCell 
                        key={String(column.key)} 
                        className={column.className || ""}
                        style={getColumnStyle(column, colIndex)}
                      >
                        <div className={colIndex === 2 ? "truncate" : ""}>
                          {column.render ? column.render(item) : String(item[column.key] || "-")}
                        </div>
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell 
                        className="text-center"
                        style={{ width: '1px', whiteSpace: 'nowrap' }}
                      >
                        <div className="flex gap-2 justify-center">
                          {actions(item)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
        </ScrollArea>
      </div>

      {/* Pagination */}
      <div className="flex justify-center">
        <ReusablePagination
          currentPage={effectivePage}
          totalPages={effectiveTotalPages}
          onPageChange={goToPage}
          showFirstLast={true}
          showPageInfo={true}
          pageInfoText={(current, total) => `Página ${current} de ${total}`}
        />
      </div>
    </div>
  );
}
