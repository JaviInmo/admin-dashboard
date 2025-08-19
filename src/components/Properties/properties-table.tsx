// src/components/Properties/PropertiesTable.tsx
"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Pencil, Trash, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { AppProperty } from "@/lib/services/properties"
import CreatePropertyDialog from "./Create/Create"
import EditPropertyDialog from "./Edit/Edit"
import DeletePropertyDialog from "./Delete/Delete"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ClickableAddress } from "@/components/ui/clickable-address"

// Componente helper para texto que se adapta automáticamente
function AdaptiveText({ text, maxWidth = "200px" }: { text: string; maxWidth?: string }) {
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current && measureRef.current) {
        // Obtener el ancho máximo permitido
        const maxWidthValue = parseInt(maxWidth.replace('px', '')) || 200;
        
        // Medir el ancho real del texto
        measureRef.current.textContent = text;
        const textWidth = measureRef.current.offsetWidth;
        
        // Solo truncar si el texto es más ancho que el máximo permitido
        const shouldTruncate = textWidth > maxWidthValue;
        setIsOverflowing(shouldTruncate);
      }
    };

    checkOverflow();
    // Usar un timeout más largo para asegurar que el layout esté completamente renderizado
    const timer = setTimeout(checkOverflow, 200);
    
    return () => clearTimeout(timer);
  }, [text, maxWidth]);

  if (!text) {
    return <span>-</span>;
  }

  const content = (
    <>
      {/* Elemento invisible para medir el ancho real del texto */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 'auto',
          width: 'auto',
          whiteSpace: 'nowrap',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 'inherit'
        }}
      />
      
      {/* Elemento visible con el texto */}
      <div
        ref={textRef}
        className={isOverflowing ? "cursor-help" : ""}
        style={{ 
          maxWidth,
          overflow: isOverflowing ? 'hidden' : 'visible',
          textOverflow: isOverflowing ? 'ellipsis' : 'initial',
          whiteSpace: 'nowrap'
        }}
      >
        {text}
      </div>
    </>
  );

  if (isOverflowing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{content}</div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="whitespace-normal break-words">{text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <div>{content}</div>;
}

export interface PropertiesTableProps {
  properties: AppProperty[]
  onSelectProperty?: (id: number) => void
  onRefresh?: () => Promise<void>
  serverSide?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  pageSize?: number
  onSearch?: (term: string) => void
  onPageSizeChange?: (pageSize: number) => void
  propertyTypesMap?: Record<number, string>
}

export default function PropertiesTable({
  properties,
  onSelectProperty,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onSearch,
  onPageSizeChange,
  propertyTypesMap,
}: PropertiesTableProps) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<string>("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editProperty, setEditProperty] = React.useState<AppProperty | null>(null)
  const [deleteProperty, setDeleteProperty] = React.useState<AppProperty | null>(null)

  const itemsPerPage = pageSize ?? 5

  // estilos y animación del search
  const [highlightSearch, setHighlightSearch] = React.useState(true)
  const searchRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (searchRef.current) {
      try { searchRef.current.focus() } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500)
    return () => clearTimeout(t)
  }, [])

  /**
   * Normalización:
   * - ownerName: intenta username, luego nombre completo, luego fallback a #ownerId
   * - typesOfServiceStr: soporta:
   *     - [{id, name}, {..}] -> mostrar names
   *     - [1,2,3] -> usar propertyTypesMap (si viene) o mostrar ids
   */
  const normalized = properties.map(p => {
    // owner name
    const od: any = (p as any).ownerDetails ?? {}
    let ownerName = ""
    // posibles campos donde puede venir el username
    const usernameCandidates = [od.username, od.user_username, od.user_name]
    for (const cand of usernameCandidates) {
      if (typeof cand === "string" && cand.trim() !== "") {
        ownerName = cand.trim()
        break
      }
    }
    if (!ownerName) {
      const first = od.first_name ?? od.firstName ?? ""
      const last = od.last_name ?? od.lastName ?? ""
      if ((first || last) && `${first} ${last}`.trim() !== "") ownerName = `${first} ${last}`.trim()
    }
    if (!ownerName) {
      // ownerDetails.user a veces es un id numérico
      if (typeof od.user === "number") ownerName = `#${od.user}`
    }
    if (!ownerName) ownerName = `#${(p as any).ownerId ?? (p as any).owner ?? p.id}`

    // types_of_service puede venir como array de objetos { id, name } o array de ids
    let typesOfServiceStr = ""
    const tos: any = (p as any).typesOfService ?? (p as any).types_of_service ?? []
    if (Array.isArray(tos)) {
      typesOfServiceStr = tos
        .map((t: any) => {
          if (!t && t !== 0) return null
          // si t es objeto con name
          if (typeof t === "object") {
            return String(t.name ?? t.title ?? t.id ?? "")
          }
          // si t es number (id), buscar en map si existe
          if (typeof t === "number") {
            return propertyTypesMap?.[t] ?? String(t)
          }
          // si t es string (ej. '1' o 'name')
          if (typeof t === "string") {
            // si es numérica, buscar en map
            const n = Number(t)
            if (!Number.isNaN(n)) return propertyTypesMap?.[n] ?? t
            return t
          }
          return null
        })
        .filter(Boolean)
        .join(", ")
    }

    return {
      ...(p as any),
      ownerName,
      typesOfServiceStr,
    } as AppProperty & { ownerName: string; typesOfServiceStr: string }
  })

  const localFilteredAndSorted = normalized
    .filter((p) => {
      const q = search.toLowerCase()
      return (
        (p.ownerName ?? "").toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q) ||
        (p.typesOfServiceStr ?? "").toLowerCase().includes(q) ||
        (String(p.monthlyRate ?? "") ?? "").toLowerCase().includes(q) ||
        String(p.totalHours ?? "").toLowerCase().includes(q) ||
        (p.contractStartDate ?? "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const valA = (a as any)[sortField] ?? ""
      const valB = (b as any)[sortField] ?? ""
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

  const effectiveList = serverSide ? normalized : localFilteredAndSorted
  const localTotalPages = Math.max(1, Math.ceil(localFilteredAndSorted.length / itemsPerPage))
  const effectiveTotalPages = serverSide ? Math.max(1, totalPages ?? 1) : localTotalPages
  const effectivePage = serverSide ? Math.max(1, Math.min(currentPage, effectiveTotalPages)) : page
  const startIndex = (effectivePage - 1) * itemsPerPage
  const paginated = serverSide ? effectiveList : effectiveList.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    if (!serverSide) setPage(1)
  }, [properties.length, search, serverSide])

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (!serverSide) return
    if (!onSearch) return
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
      searchTimerRef.current = null
    }
    searchTimerRef.current = setTimeout(() => {
      onSearch(search)
    }, 350)
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
        searchTimerRef.current = null
      }
    }
  }, [search, serverSide, onSearch])

  const goToPage = (p: number) => {
    const newP = Math.max(1, Math.min(effectiveTotalPages, p))
    if (serverSide) onPageChange?.(newP)
    else setPage(newP)
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">Lista de Propiedades</h3>
        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div className={`${highlightSearch ? "search-highlight search-pulse" : ""}`} style={{ minWidth: 280 }}>
            <Input
              ref={searchRef}
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label="Buscar propiedades"
            />
          </div>
        </div>
        
        {/* Selector de Page Size */}
        <div className="flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {pageSize} por página
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[5, 10, 20, 50, 100].map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => onPageSizeChange?.(size)}
                  className={pageSize === size ? "bg-accent" : ""}
                >
                  {size} por página
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex-none">
          <Button onClick={() => setCreateOpen(true)}>Agregar</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => toggleSort("ownerName")} className="cursor-pointer select-none max-w-[120px]">Owner {renderSortIcon("ownerName")}</TableHead>
            <TableHead onClick={() => toggleSort("name")} className="cursor-pointer select-none max-w-[150px]">Name {renderSortIcon("name")}</TableHead>
            <TableHead onClick={() => toggleSort("address")} className="cursor-pointer select-none max-w-[200px]">Address {renderSortIcon("address")}</TableHead>
            <TableHead onClick={() => toggleSort("typesOfServiceStr")} className="cursor-pointer select-none max-w-[150px]">Service Types {renderSortIcon("typesOfServiceStr")}</TableHead>
            <TableHead onClick={() => toggleSort("monthlyRate")} className="cursor-pointer select-none w-[120px]">Monthly Rate {renderSortIcon("monthlyRate")}</TableHead>
            <TableHead onClick={() => toggleSort("totalHours")} className="cursor-pointer select-none w-[120px]">Total Hours {renderSortIcon("totalHours")}</TableHead>
            <TableHead onClick={() => toggleSort("contractStartDate")} className="cursor-pointer select-none w-[140px]">Start Date {renderSortIcon("contractStartDate")}</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((p, idx) => (
            <TableRow
              key={p.id}
              className={`cursor-pointer hover:bg-muted ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"}`}
              onClick={() => onSelectProperty?.(p.id)}
              role={onSelectProperty ? "button" : undefined}
              tabIndex={onSelectProperty ? 0 : undefined}
              onKeyDown={(e) => {
                if (!onSelectProperty) return
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectProperty(p.id)
                }
              }}
            >
              <TableCell className="max-w-[120px]">
                {/* ownerName plain text (no blue) */}
                <div className="w-full">
                  <span>{(p as any).ownerName ?? `#${(p as any).ownerId ?? (p as any).owner ?? p.id}`}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-[150px]">
                <span>{p.name || ""}</span>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <ClickableAddress address={p.address} maxWidth="200px" />
              </TableCell>
              <TableCell className="max-w-[150px]">
                <span>{(p as any).typesOfServiceStr || "-"}</span>
              </TableCell>
              <TableCell>{p.monthlyRate ?? "-"}</TableCell>
              <TableCell>{p.totalHours ?? "-"}</TableCell>
              <TableCell>{p.contractStartDate ?? "-"}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditProperty(p)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteProperty(p)
                  }}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => goToPage(effectivePage - 1)} className={effectivePage === 1 ? "pointer-events-none opacity-50" : ""}/>
            </PaginationItem>

            {/* Lógica de paginación estándar con máximo 7 páginas */}
            {(() => {
              const totalPages = effectiveTotalPages;
              const currentPage = effectivePage;
              const pages: (number | string)[] = [];

              if (totalPages <= 5) {
                // Si hay 5 páginas o menos, mostrar todas
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Siempre mostrar primera página
                pages.push(1);

                if (currentPage <= 3) {
                  // Caso: página actual está cerca del inicio
                  for (let i = 2; i <= 4; i++) {
                    pages.push(i);
                  }
                  pages.push("...");
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 2) {
                  // Caso: página actual está cerca del final
                  pages.push("...");
                  for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Caso: página actual está en el medio
                  pages.push("...");
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                  }
                  pages.push("...");
                  pages.push(totalPages);
                }
              }

              return pages.map((page, index) => (
                <PaginationItem key={index}>
                  {page === "..." ? (
                    <span className="px-3 py-2 text-sm">...</span>
                  ) : (
                    <PaginationLink
                      isActive={effectivePage === page}
                      onClick={() => goToPage(page as number)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ));
            })()}

            <PaginationItem>
              <PaginationNext onClick={() => goToPage(effectivePage + 1)} className={effectivePage === effectiveTotalPages ? "pointer-events-none opacity-50" : ""}/>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <CreatePropertyDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editProperty && <EditPropertyDialog property={editProperty} onClose={() => setEditProperty(null)} onUpdated={onRefresh} />}
      {deleteProperty && <DeletePropertyDialog property={deleteProperty} onClose={() => setDeleteProperty(null)} onDeleted={onRefresh} />}
    </div>
  )
}
