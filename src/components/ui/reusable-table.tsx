// src/components/ui/reusable-table.tsx
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
import { TableLoadingCell } from "./table";

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

  sortField?: keyof T | string;
  sortOrder?: SortOrder;
  toggleSort?: (field: keyof T | string) => void;

  actions?: (item: T) => React.ReactNode;
  actionsHeader?: string;
  rightControls?: React.ReactNode;

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
  rightControls,
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

  // Calcular altura de fila consistente para evitar saltos durante loading
  const hasSmallPadding = columns.some(col => col.cellClassName?.includes('py-1'));
  const hasMediumPadding = columns.some(col => col.cellClassName?.includes('py-2'));
  
  let rowHeight: string;
  if (hasSmallPadding) {
    rowHeight = "49px";
  } else if (hasMediumPadding) {
    rowHeight = "53px";
  } else {
    rowHeight = "57px";
  }

  const getColumnStyle = (column: Column<T>, columnIndex: number) => {
    const styles: React.CSSProperties = {};
    if (column.width) styles.width = column.width;
    if (column.minWidth) styles.minWidth = column.minWidth;
    if (column.maxWidth) styles.maxWidth = column.maxWidth;

    if (column.autoSize) {
      styles.width = "auto";
      styles.whiteSpace = "nowrap";
      styles.overflow = "hidden";
      styles.textOverflow = "ellipsis";
    }

    if (!column.width && !column.autoSize && columnStrategy.widths[columnIndex]) {
      styles.width = columnStrategy.widths[columnIndex];
      styles.minWidth = columnStrategy.type === "content-based" ? "80px" : "60px";
    }

    if (columnStrategy.type === "sacrifice" || columnStrategy.type === "content-based") {
      styles.overflow = "hidden";
      styles.textOverflow = "ellipsis";
      styles.whiteSpace = styles.whiteSpace ?? "nowrap";
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
      } catch {
        // ignore
      }
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const getSearchableValue = (value: any) => {
    if (value == null) return "";
    if (Array.isArray(value)) return value.join(" ");
    if (typeof value === "object") {
      return (value.name ?? value.title ?? JSON.stringify(value)) + "";
    }
    return String(value);
  };

  const localFiltered = data.filter((item) => {
    const q = (search ?? "").toLowerCase();
    if (!q) return true;
    return searchFields.some((field) => {
      const value = (item as any)[field];
      return getSearchableValue(value).toLowerCase().includes(q);
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

  const renderSortIcon = (field: keyof T | string) => {
    if (!toggleSort) return null;
    if (String(sortField) !== String(field))
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
      {/* Header controls */}
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

      {/* Table container: single table with sticky thead */}
      <div
        className="rounded-md border overflow-auto"
        ref={tableContainerRef}
        style={{ maxHeight: "50vh", scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}
      >
        <table className="w-full" style={{ tableLayout: "auto", borderCollapse: "separate" }}>
          <thead>
            <tr>
              {columns.map((column, index) => {
                const isHidden = columnStrategy.hiddenColumns.includes(index);
                if (isHidden) return null;

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
                  // ensure header can shrink
                  "min-w-0",
                ]
                  .filter(Boolean)
                  .join(" ");

                const headerInnerClass = hasHeaderCenter ? "flex items-center justify-center gap-1 min-h-[1.5rem] min-w-0" : "flex items-center justify-between min-h-[1.5rem] min-w-0";
                const iconWrapperClass = hasHeaderCenter ? "flex-shrink-0" : "flex-shrink-0 ml-1";

                return (
                  <th
                    key={String(column.key)}
                    onClick={column.sortable && toggleSort ? () => toggleSort(column.key) : undefined}
                    className={thClasses}
                    style={{
                      ...getColumnStyle(column, index),
                      ...(column.headerStyle || {}),
                      position: "sticky",
                      top: 0,
                      zIndex: 30,
                      background: "var(--background)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: (column.minWidth ?? undefined),
                    }}
                  >
                    <div className={headerInnerClass} style={{ minWidth: 0 }}>
                      <div className={`truncate font-semibold min-w-0`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {column.label}
                      </div>
                      <div className={iconWrapperClass}>
                        {column.sortable && toggleSort && renderSortIcon(column.key)}
                      </div>
                    </div>
                  </th>
                );
              })}

              {actions && (
                <th
                  className="text-center font-medium text-foreground px-4 py-4 align-middle min-w-0"
                  style={{
                    width: "auto",
                    minWidth: "140px",
                    maxWidth: "260px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    position: "sticky",
                    top: 0,
                    zIndex: 30,
                    background: "var(--background)",
                  }}
                >
                  <div className="truncate min-w-0" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {actionsHeaderText}
                  </div>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {isPageLoading ? (
              Array.from({ length: pageSize }, (_, rowIdx) => (
                <tr
                  key={`loading-row-${rowIdx}`}
                  className={`border-b border-border/50 ${rowIdx % 2 === 0 ? "bg-transparent" : "bg-muted/10"}`}
                  style={{ height: rowHeight }}
                >
                  {columns.map((column, colIndex) => {
                    const isHidden = columnStrategy.hiddenColumns.includes(colIndex);
                    if (isHidden) return null;

                    const tdClasses = [
                      "px-4",
                      hasMediumPadding ? "py-2" : hasSmallPadding ? "py-1" : "py-3",
                      "border-r",
                      "border-border/20",
                      "last:border-r-0",
                      "align-middle",
                      column.cellClassName || "",
                      "min-w-0",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    let loadingWidth: "short" | "medium" | "long" | "full" = "medium";
                    const columnKey = String(column.key).toLowerCase();

                    if (columnKey.includes('name') || columnKey.includes('title')) {
                      loadingWidth = "long";
                    } else if (columnKey.includes('phone') || columnKey.includes('status')) {
                      loadingWidth = "short";
                    } else if (columnKey.includes('email') || columnKey.includes('address')) {
                      loadingWidth = "medium";
                    }

                    return (
                      <td
                        key={String(column.key)}
                        className={tdClasses}
                        style={{
                          ...getColumnStyle(column, colIndex),
                        }}
                      >
                        <div className="truncate min-w-0">
                          <TableLoadingCell width={loadingWidth} />
                        </div>
                      </td>
                    );
                  })}

                  {actions && (
                    <td
                      className={`text-center ${hasMediumPadding ? "py-2" : hasSmallPadding ? "py-1" : "py-3"} align-middle`}
                      style={{ width: "auto", minWidth: "140px", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      <div className="flex gap-2 justify-center">
                        <TableLoadingCell width="short" />
                        <TableLoadingCell width="short" />
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.filter((_, index) => !columnStrategy.hiddenColumns.includes(index)).length + (actions ? 1 : 0)}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.084-2.334.414-.98.858-1.895 1.39-2.732A9.936 9.936 0 0112 7c.993 0 1.953.138 2.863.395M6.228 6.228L21 21" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">
                      {TEXT?.table?.noMatch ?? "No hay coincidencias"}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {search
                        ? (TEXT?.table?.noResults?.replace("{search}", search) ?? `No se encontraron resultados para "${search}"`)
                        : (TEXT?.table?.noData ?? "No hay datos disponibles")
                      }
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIdx) => (
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
                  style={{ height: rowHeight }}
                >
                  {columns.map((column, colIndex) => {
                    const isHidden = columnStrategy.hiddenColumns.includes(colIndex);
                    if (isHidden) return null;

                    const hasCellTextAlign = !!(column.cellClassName && /\btext-(left|center|right|start|end)\b/.test(column.cellClassName));
                    const hasCellCenter = !!(column.cellClassName && /\btext-center\b/.test(column.cellClassName));

                    const tdClasses = [
                      hasCellTextAlign ? "" : "text-left",
                      "px-4",
                      hasMediumPadding ? "py-2" : hasSmallPadding ? "py-1" : "py-3",
                      "border-r",
                      "border-border/20",
                      "last:border-r-0",
                      "align-middle",
                      column.cellClassName || "",
                      "min-w-0",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <td
                        key={String(column.key)}
                        className={tdClasses}
                        style={{ ...getColumnStyle(column, colIndex), ...(column.cellStyle || {}) }}
                      >
                        <div className={`truncate min-w-0 ${hasCellCenter ? "text-center" : ""}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {column.render ? column.render(item) : String(item[column.key] ?? "-")}
                        </div>
                      </td>
                    );
                  })}

                  {actions && (
                    <td
                      className={`text-center ${hasMediumPadding ? "py-2" : hasSmallPadding ? "py-1" : "py-3"} align-middle`}
                      style={{ width: "auto", minWidth: "140px", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      <div className="flex gap-2 justify-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}

            {!isPageLoading && emptyRows.map((emptyRow, emptyIdx) => (
              <tr
                key={emptyRow.id}
                className={`border-b border-border/50 ${ (paginatedData.length + emptyIdx) % 2 === 0 ? "bg-transparent" : "bg-muted/10" }`}
                style={{ height: rowHeight }}
              >
                {columns.map((column, colIndex) => {
                  const isHidden = columnStrategy.hiddenColumns.includes(colIndex);
                  if (isHidden) return null;

                  const tdClasses = [
                    hasMediumPadding ? "py-2" : hasSmallPadding ? "py-1" : "py-3",
                    "px-4",
                    "border-r",
                    "border-border/20",
                    "last:border-r-0",
                    "align-middle",
                    "min-w-0",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <td key={String(column.key)} className={tdClasses} style={getColumnStyle(column, colIndex)}>
                      <div className="truncate min-w-0" />
                    </td>
                  );
                })}

                {actions && (
                  <td className={`text-center ${hasMediumPadding ? "py-2" : hasSmallPadding ? "py-1" : "py-3"}`} style={{ width: "auto", minWidth: "140px", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {/* empty */}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div></div>
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
        <div className="flex items-center">
          {rightControls}
        </div>
      </div>
    </div>
  );
}
