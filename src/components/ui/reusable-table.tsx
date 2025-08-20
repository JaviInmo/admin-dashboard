"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReusablePagination } from "@/components/ui/reusable-pagination";
import type { SortOrder } from "@/lib/sort";
import PageSizeSelector from "@/components/ui/PageSizeSelector";
import { useI18n } from "@/i18n";
import { useIntelligentColumns } from "@/hooks/use-intelligent-columns";

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
  const { TEXT } = useI18n();
  
  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const itemsPerPage = pageSize ?? 5;

  // Hook inteligente para distribución de columnas
  const columnStrategy = useIntelligentColumns(columns, data, tableContainerRef as React.RefObject<HTMLElement>);

  // Función helper para calcular estilos de columna usando estrategia inteligente
  const getColumnStyle = (_column: Column<T>, columnIndex: number) => {
    const styles: React.CSSProperties = {};
    
    // Si está en la lista de columnas ocultas, ocultarla
    if (columnStrategy.hiddenColumns.includes(columnIndex)) {
      styles.display = 'none';
      return styles;
    }
    
    // Usar el ancho calculado por la estrategia inteligente
    if (columnStrategy.widths[columnIndex]) {
      styles.width = columnStrategy.widths[columnIndex];
      styles.minWidth = columnStrategy.type === 'content-based' ? '80px' : '60px';
    }
    
    // Configurar overflow para evitar texto muy largo
    if (columnStrategy.type === 'sacrifice' || columnStrategy.type === 'content-based') {
      styles.overflow = 'hidden';
      styles.textOverflow = 'ellipsis';
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
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />;
    return sortOrder === "asc" ? 
      <ArrowUp className="h-4 w-4 text-primary" /> : 
      <ArrowDown className="h-4 w-4 text-primary" />;
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
            ariaLabel={TEXT.properties?.table?.pageSizeLabel ?? "Filas por página"}
          />
        </div>

        {onAddClick && (
          <div className="flex-none">
            <Button onClick={onAddClick}>{addButtonText}</Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border" ref={tableContainerRef}>
        <div className="relative">
          {/* Fixed Header */}
          <div className="bg-background border-b sticky top-0 z-30">
            <div className="overflow-hidden">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {columns.map((column, index) => {
                      const isHidden = columnStrategy.hiddenColumns.includes(index);
                      if (isHidden) return null;
                      
                      return (
                        <th
                          key={String(column.key)}
                          onClick={column.sortable && toggleSort ? () => toggleSort(column.key) : undefined}
                          className={`text-left font-medium text-foreground px-4 py-4 border-r border-border/30 last:border-r-0 ${getColumnClasses(column)} ${
                            column.sortable && toggleSort ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors select-none' : ''
                          }`}
                          style={getColumnStyle(column, index)}
                        >
                          <div className="flex items-center justify-between min-h-[1.5rem]">
                            <span className="truncate font-semibold">{column.label}</span>
                            <div className="flex-shrink-0 ml-2">
                              {column.sortable && toggleSort && renderSortIcon(column.key)}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                    {actions && (
                      <th 
                        className="text-center font-medium text-foreground px-4 py-4"
                        style={{ width: '10%', minWidth: '80px', maxWidth: '120px' }}
                      >
                        <span className="font-semibold">Acciones</span>
                      </th>
                    )}
                  </tr>
                </thead>
              </table>
            </div>
          </div>

          {/* Scrollable Body */}
          <div 
            className="max-h-[50vh] overflow-auto scroll-smooth
                       scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border
                       hover:scrollbar-thumb-muted-foreground/50 scrollbar-thumb-rounded-full
                       transition-all duration-200"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--border)) transparent'
            }}
          >
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <tbody>
                {paginatedData.map((item, rowIdx) => (
                  <tr
                    key={String(getItemId(item))}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors duration-150 ${
                      rowIdx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    } border-b border-border/50`}
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
                    {columns.map((column, colIndex) => {
                      const isHidden = columnStrategy.hiddenColumns.includes(colIndex);
                      if (isHidden) return null;
                      
                      return (
                        <td 
                          key={String(column.key)} 
                          className={`px-4 py-3 border-r border-border/20 last:border-r-0 ${column.className || ""}`}
                          style={getColumnStyle(column, colIndex)}
                        >
                          <div className="truncate">
                            {column.render ? column.render(item) : String(item[column.key] || "-")}
                          </div>
                        </td>
                      );
                    })}
                    {actions && (
                      <td 
                        className="text-center px-4 py-3"
                        style={{ width: '10%', minWidth: '80px', maxWidth: '120px' }}
                      >
                        <div className="flex gap-1 justify-center">
                          {actions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
