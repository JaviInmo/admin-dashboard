// src/components/Clients/ClientsTable.tsx
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
import type { Client as AppClient } from "./types"
import CreateClientDialog from "./Create/Create"
import EditClientDialog from "./Edit/Edit"
import DeleteClientDialog from "./Delete/Delete"
import { useI18n } from "@/i18n"

// <-- IMPORT DEL SCROLLAREA de shadcn
import { ScrollArea } from "@/components/ui/scroll-area"

export interface ClientsTableProps {
  clients: AppClient[]
  onSelectClient: (id: number) => void
  onRefresh?: () => Promise<void>

  // server-side pagination (optional)
  serverSide?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  pageSize?: number
  onSearch?: (term: string) => void
  onPageSizeChange?: (pageSize: number) => void

  // ocultar columna balance (por defecto: oculto)
  hideBalance?: boolean
}

export default function ClientsTable({
  clients,
  onSelectClient,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onSearch,
  onPageSizeChange,
  hideBalance = true, // <- ocultamos por defecto según tu petición
}: ClientsTableProps) {
  const { TEXT } = useI18n()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  // default sort by first name (we treat "Client Name" as firstName + lastName)
  const [sortField, setSortField] = React.useState<keyof AppClient>("firstName")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editClient, setEditClient] = React.useState<AppClient | null>(null)
  const [deleteClient, setDeleteClient] = React.useState<AppClient | null>(null)

  // local page size (used only when not serverSide)
  const itemsPerPage = pageSize ?? 5

  // highlight flag for initial blink/pulse
  const [highlightSearch, setHighlightSearch] = React.useState(true)
  const searchRef = React.useRef<HTMLInputElement | null>(null)

  // Normalize fields and compute clientName
  const normalizedClients = clients.map(c => {
    const firstName = c.firstName ?? (c as any).first_name ?? ""
    const lastName = c.lastName ?? (c as any).last_name ?? ""
    const clientName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : (c.username ?? (c as any).name ?? "")
    return {
      ...c,
      firstName,
      lastName,
      clientName,
    } as AppClient & { clientName: string }
  })

  const localFilteredAndSorted = normalizedClients
    .filter((c) => {
      const q = (search ?? "").toLowerCase()
      if (!q) return true
      const clientName = (c as any).clientName ?? ""
      return (
        clientName.toLowerCase().includes(q) ||
        (c.firstName ?? "").toLowerCase().includes(q) ||
        (c.lastName ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      // special-case sorting when sortField is firstName or lastName:
      const valA = ((a as any)[sortField] ?? "") as string
      const valB = ((b as any)[sortField] ?? "") as string
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

  // When serverSide is true, do not filter/sort locally; rely on backend
  const effectiveList = serverSide ? normalizedClients : localFilteredAndSorted

  // Determine pagination values depending on mode
  const localTotalPages = Math.max(1, Math.ceil(localFilteredAndSorted.length / itemsPerPage))
  const effectiveTotalPages = serverSide ? Math.max(1, totalPages ?? 1) : localTotalPages
  const effectivePage = serverSide ? Math.max(1, Math.min(currentPage, effectiveTotalPages)) : page

  const startIndex = (effectivePage - 1) * itemsPerPage
  const paginatedClients = serverSide
    ? effectiveList // parent supplies already-paginated contents
    : effectiveList.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    // when source clients change or search changes, reset local page if not serverSide
    if (!serverSide) {
      setPage(1)
    }
  }, [clients.length, search, serverSide])

  // Debounce server-side search by 350ms
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

  React.useEffect(() => {
    // Focus the search input and keep the highlight for ~3.5s when component mounts
    if (searchRef.current) {
      try {
        searchRef.current.focus()
      } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500)
    return () => clearTimeout(t)
  }, [])

  const goToPage = (p: number) => {
    const newP = Math.max(1, Math.min(effectiveTotalPages, p))
    if (serverSide) {
      onPageChange?.(newP)
    } else {
      setPage(newP)
    }
  }

  const toggleSort = (field: keyof AppClient) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof AppClient) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    )
  }

  // Render pagination control (works for serverSide or local)
  const renderPagination = () => {
    const pages = effectiveTotalPages
    const active = effectivePage

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => goToPage(active - 1)} className={active === 1 ? "pointer-events-none opacity-50" : ""}/>
          </PaginationItem>

          {/* Lógica de paginación estándar con máximo 7 páginas */}
          {(() => {
            const totalPages = pages;
            const currentPage = active;
            const pageNumbers: (number | string)[] = [];

            if (totalPages <= 5) {
              // Si hay 5 páginas o menos, mostrar todas
              for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
              }
            } else {
              // Siempre mostrar primera página
              pageNumbers.push(1);

              if (currentPage <= 3) {
                // Caso: página actual está cerca del inicio
                for (let i = 2; i <= 4; i++) {
                  pageNumbers.push(i);
                }
                pageNumbers.push("...");
                pageNumbers.push(totalPages);
              } else if (currentPage >= totalPages - 2) {
                // Caso: página actual está cerca del final
                pageNumbers.push("...");
                for (let i = totalPages - 3; i <= totalPages; i++) {
                  pageNumbers.push(i);
                }
              } else {
                // Caso: página actual está en el medio
                pageNumbers.push("...");
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                  pageNumbers.push(i);
                }
                pageNumbers.push("...");
                pageNumbers.push(totalPages);
              }
            }

            return pageNumbers.map((page, index) => (
              <PaginationItem key={index}>
                {page === "..." ? (
                  <span className="px-3 py-2 text-sm">...</span>
                ) : (
                  <PaginationLink
                    isActive={active === page}
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
            <PaginationNext onClick={() => goToPage(active + 1)} className={active === pages ? "pointer-events-none opacity-50" : ""}/>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* Header row: Title | Search | Add button */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">{TEXT.clients.list.title}</h3>

        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div className={`${highlightSearch ? "search-highlight search-pulse" : ""}`} style={{ minWidth: 280 }}>
            <Input
              ref={searchRef}
              placeholder={TEXT.clients.list.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label={TEXT.clients.list.searchPlaceholder}
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
          <Button onClick={() => setCreateOpen(true)}>{TEXT.clients.list.addClient}</Button>
        </div>
      </div>

      {/* ========== Aquí añadí ScrollArea + max-h para evitar overflow ========== */}
      <ScrollArea className="rounded-md border">
        <div className="max-h-[48vh]">
          {/* Mantengo un min-width para evitar que la tabla se rompa en pantallas grandes;
              ajusta o quita si prefieres que ocupe todo el ancho */}
          <div className="min-w-[60vw]">
            <Table className="table-fixed w-full border-collapse">
              {/* header sticky para que siempre sea visible al scrollear */}
              <TableHeader className="sticky top-0 z-20 bg-card border-b">
                <TableRow>
                  <TableHead onClick={() => toggleSort("firstName")} className="cursor-pointer select-none max-w-[150px]">
                    {TEXT.clients.list.headers.clientName} {renderSortIcon("firstName")}
                  </TableHead>
                  <TableHead onClick={() => toggleSort("email")} className="cursor-pointer select-none max-w-[180px]">
                    {TEXT.clients.list.headers.email} {renderSortIcon("email")}
                  </TableHead>
                  <TableHead onClick={() => toggleSort("phone")} className="cursor-pointer select-none max-w-[120px]">
                    {TEXT.clients.list.headers.phone} {renderSortIcon("phone")}
                  </TableHead>

                  {/* balance header hidden when hideBalance === true */}
                  {!hideBalance && (
                    <TableHead onClick={() => toggleSort("balance")} className="cursor-pointer select-none">
                      {TEXT.clients.list.headers.balance} {renderSortIcon("balance")}
                    </TableHead>
                  )}

                  <TableHead className="w-[120px]">{TEXT.clients.list.headers.status}</TableHead>
                  <TableHead className="w-[100px] text-center">{TEXT.clients.list.headers.actions}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedClients.map((client, idx) => {
                  const clientName = ((client as any).clientName ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()) || "-"
                  return (
                    <TableRow
                      key={client.id}
                      className={`cursor-pointer hover:bg-muted ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"}`}
                      onClick={() => onSelectClient(client.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onSelectClient(client.id)
                        }
                      }}
                    >
                      <TableCell className="max-w-[150px]">
                        <span>{clientName}</span>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <span>{client.email ?? "-"}</span>
                      </TableCell>
                      <TableCell className="max-w-[120px]">
                        <span>{client.phone ?? "-"}</span>
                      </TableCell>

                      {/* balance cell hidden when hideBalance === true */}
                      {!hideBalance && <TableCell className="min-w-fit whitespace-nowrap px-4">{client.balance ?? "-"}</TableCell>}

                      <TableCell className="min-w-fit whitespace-nowrap px-4">{(client.isActive ?? true) ? TEXT.clients.list.statusActive : TEXT.clients.list.statusInactive}</TableCell>
                      <TableCell className="min-w-fit whitespace-nowrap px-4">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditClient(client)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteClient(client)
                            }}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end">
        {renderPagination()}
      </div>

      <CreateClientDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editClient && <EditClientDialog client={editClient} onClose={() => setEditClient(null)} onUpdated={onRefresh} />}
      {deleteClient && <DeleteClientDialog client={deleteClient} onClose={() => setDeleteClient(null)} onDeleted={onRefresh} />}
    </div>
  )
}
