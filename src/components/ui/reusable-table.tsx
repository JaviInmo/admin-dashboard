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
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  autoSize?: boolean;
  flex?: number;
  className?: string;

  headerClassName?: string;
  cellClassName?: string;
  headerStyle?: React.CSSProperties;
  cellStyle?: React.CSSProperties;
}

export interface ReusableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getItemId: (item: T) => number | string;
  onSelectItem?: (id: number | string) => void;

  title?: string;
  searchPlaceholder?: string;
  addButtonText?: string;
  onAddClick?: () => void;

  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  isPageLoading?: boolean;

  onSearch?: (term: string) => void;
  searchFields?: (keyof T)[];

  sortField?: keyof T;
  sortOrder?: SortOrder;
  toggleSort?: (field: keyof T) => void;

  actions?: (item: T) => React.ReactNode;
  actionsHeader?: string;

  onRefresh?: () => Promise<void>;
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
  isPageLoading = false,
  onSearch,
  searchFields = [],
  sortField,
  sortOrder = "asc",
  toggleSort,
  actions,
  actionsHeader,
  className = "",
}: ReusableTableProps<T>) {
  const { TEXT } = useI18n();

  const [page, setPage] = React.useState<number>(1);
  const [search, setSearch] = React.useState<string>("");
  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const [stableCurrentPage, setStableCurrentPage] = React.useState<number>(currentPage);
  const [stableTotalPages, setStableTotalPages] = React.useState<number>(totalPages);

  React.useEffect(() => {
    if (!isPageLoading) {
      setStableCurrentPage(currentPage);
      setStableTotalPages(totalPages);
    }
  }, [currentPage, totalPages, isPageLoading]);

  const displayCurrentPage = isPageLoading ? stableCurrentPage : currentPage;
  const displayTotalPages = isPageLoading ? stableTotalPages : totalPages;

  const itemsPerPage = pageSize ?? 5;

  const columnStrategy = useIntelligentColumns(columns, data, tableContainerRef as React.RefObject<HTMLElement>);

  const getColumnStyle = (column: Column<T>, columnIndex: number) => {
    const styles: React.CSSProperties = {};
    // si la columna define width explícito, úsalo (tiene prioridad)
    if (column.width) styles.width = column.width;
    if (column.minWidth) styles.minWidth = column.minWidth;
    if (column.maxWidth) styles.maxWidth = column.maxWidth;

    // fallback a estrategia inteligente (solo si no se definió width explícito)
    if (!column.width && columnStrategy.widths[columnIndex]) {
      styles.width = columnStrategy.widths[columnIndex];
      styles.minWidth = columnStrategy.type === "content-based" ? "80px" : "60px";
    }

    if (columnStrategy.type === "sacrifice" || columnStrategy.type === "content-based") {
      styles.overflow = "hidden";
      styles.textOverflow = "ellipsis";
      styles.whiteSpace = "nowrap";
    }
    return styles;
  };

  const getColumnClasses = (column: Column<T>) => {
    let classes = (column.className || "").trim();
    if (column.sortable && toggleSort) {
      classes += (classes ? " " : "") + " cursor-pointer select-none";
    }
    return classes.trim();
  };

  React.useEffect(() => {
    if (searchRef.current) {
      try {
        searchRef.current.focus();
      } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const localFiltered = data.filter((item) => {
    const q = (search ?? "").toLowerCase();
    if (!q) return true;
    return searchFields.some((field) => {
      const value = item[field];
      return String(value ?? "").toLowerCase().includes(q);
    });
  });

  const effectiveList = serverSide ? data : localFiltered;
  const localTotalPages = Math.max(1, Math.ceil(localFiltered.length / itemsPerPage));
  const effectiveTotalPages = serverSide ? Math.max(1, totalPages ?? 1) : localTotalPages;
  const effectivePage = serverSide ? Math.max(1, Math.min(currentPage, effectiveTotalPages)) : page;

  const displayEffectivePage = serverSide
    ? Math.max(1, Math.min(displayCurrentPage, displayTotalPages))
    : page;
  const displayEffectiveTotalPages = serverSide ? displayTotalPages : localTotalPages;

  const startIndex = (effectivePage - 1) * itemsPerPage;
  const paginatedData = serverSide ? effectiveList : effectiveList.slice(startIndex, startIndex + itemsPerPage);

  const emptyRowsNeeded = Math.max(0, itemsPerPage - paginatedData.length);
  const emptyRows = Array.from({ length: emptyRowsNeeded }, (_, index) => ({
    id: `empty-${index}`,
    isEmpty: true,
  }));

  React.useEffect(() => {
    if (!serverSide) setPage(1);
  }, [search, serverSide, data.length]);

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
    if (serverSide) {
      onPageChange?.(newP);
    } else {
      setPage(newP);
    }
  };

  const renderSortIcon = (field: keyof T) => {
    if (!toggleSort) return null;
    if (sortField !== field)
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />;
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4 text-primary" /> : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const actionsHeaderText = actionsHeader ?? TEXT?.properties?.table?.headers?.actions ?? "Actions";

  const formatPageInfo = (current: number, total: number) => {
    const tpl = TEXT?.pagination?.pageInfo;
    if (tpl) return tpl.replace("{current}", String(current)).replace("{total}", String(total));
    return `Página ${current} de ${total}`;
  };

  return (
    <div className={`rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        {title && <h3 className="text-lg font-semibold md:mr-4">{title}</h3>}

        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div className={`${highlightSearch ? "search-highlight search-pulse" : ""}`} style={{ minWidth: 280 }}>
            <Input ref={searchRef} placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.currentTarget.value)} className="w-full" aria-label={searchPlaceholder} />
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
              <table className="w-full" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    {columns.map((column, index) => {
                      const isHidden = columnStrategy.hiddenColumns.includes(index);
                      if (isHidden) return null;

                      // detect alignment classes in headerClassName
                      const hasHeaderTextAlign = !!(column.headerClassName && /\btext-(left|center|right|start|end)\b/.test(column.headerClassName));
                      const hasHeaderCenter = !!(column.headerClassName && /\btext-center\b/.test(column.headerClassName));

                      const thClasses = [
                        hasHeaderTextAlign ? "" : "text-left",
                        "font-medium",
                        "text-foreground",
                        "px-4",
                        "py-4",
                        "border-r",
                        "border-border/30",
                        "last:border-r-0",
                        "align-middle",
                        getColumnClasses(column),
                        column.headerClassName || "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      // if header wants center, center label+icon; else justify-between (label left, icon right)
                      const headerInnerClass = hasHeaderCenter ? "flex items-center justify-center gap-2 min-h-[1.5rem]" : "flex items-center justify-between min-h-[1.5rem]";
                      const iconWrapperClass = hasHeaderCenter ? "flex-shrink-0" : "flex-shrink-0 ml-2";

                      return (
                        <th key={String(column.key)} onClick={column.sortable && toggleSort ? () => toggleSort(column.key) : undefined} className={thClasses} style={{ ...getColumnStyle(column, index), ...(column.headerStyle || {}) }}>
                          <div className={headerInnerClass}>
                            <span className={`truncate font-semibold ${hasHeaderCenter ? "text-center" : ""}`}>{column.label}</span>
                            <div className={iconWrapperClass}>
                              {column.sortable && toggleSort && renderSortIcon(column.key)}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                    {actions && (
                      <th className="text-center font-medium text-foreground px-4 py-4 align-middle" style={{ width: "140px", minWidth: "80px", maxWidth: "140px" }}>
                        <span className="font-semibold">{actionsHeaderText}</span>
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
              scrollbarWidth: "thin",
              scrollbarColor: "hsl(var(--border)) transparent",
            }}
          >
            <table className="w-full" style={{ tableLayout: "fixed" }}>
              <tbody>
                {paginatedData.map((item, rowIdx) => (
                  <tr
                    key={String(getItemId(item))}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors duration-150 ${rowIdx % 2 === 0 ? "bg-transparent" : "bg-muted/10"} border-b border-border/50`}
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

                      const hasCellTextAlign = !!(column.cellClassName && /\btext-(left|center|right|start|end)\b/.test(column.cellClassName));
                      const hasCellCenter = !!(column.cellClassName && /\btext-center\b/.test(column.cellClassName));

                      const tdClasses = [
                        hasCellTextAlign ? "" : "text-left",
                        "px-4",
                        "py-3",
                        "border-r",
                        "border-border/20",
                        "last:border-r-0",
                        "align-middle",
                        column.cellClassName || "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <td key={String(column.key)} className={tdClasses} style={{ ...getColumnStyle(column, colIndex), ...(column.cellStyle || {}) }}>
                          <div className={`truncate ${hasCellCenter ? "text-center" : ""}`}>
                            {column.render ? column.render(item) : String(item[column.key] ?? "-")}
                          </div>
                        </td>
                      );
                    })}
                    {actions && (
                      <td className="text-center px-4 py-3 align-middle" style={{ width: "140px", minWidth: "80px", maxWidth: "140px" }}>
                        <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                          {actions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {emptyRows.map((emptyRow, emptyIdx) => (
                  <tr
                    key={emptyRow.id}
                    className={`border-b border-border/50 ${ (paginatedData.length + emptyIdx) % 2 === 0 ? "bg-transparent" : "bg-muted/10" }`}
                    style={{ height: "49px" }}
                  >
                    {columns.map((column, colIndex) => {
                      const isHidden = columnStrategy.hiddenColumns.includes(colIndex);
                      if (isHidden) return null;

                      const tdClasses = ["px-4", "py-3", "border-r", "border-border/20", "last:border-r-0", "align-middle"]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <td key={String(column.key)} className={tdClasses} style={getColumnStyle(column, colIndex)}>
                          <div className="truncate" />
                        </td>
                      );
                    })}
                    {actions && (
                      <td className="text-center px-4 py-3" style={{ width: "140px", minWidth: "80px", maxWidth: "140px" }}>
                        {/* empty */}
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
          currentPage={displayEffectivePage}
          totalPages={displayEffectiveTotalPages}
          onPageChange={goToPage}
          showFirstLast={true}
          showPageInfo={true}
          pageInfoText={(current, total) => formatPageInfo(current, total)}
          displayCurrentPage={displayCurrentPage}
          displayTotalPages={displayEffectiveTotalPages}
        />
      </div>
    </div>
  );
}
