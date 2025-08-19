// src/components/Clients/ClientsTable.tsx
"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Pencil, Trash, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { Client as AppClient } from "./types"
import CreateClientDialog from "./Create/Create"
import EditClientDialog from "./Edit/Edit"
import DeleteClientDialog from "./Delete/Delete"
import { useI18n } from "@/i18n"

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

          {Array.from({ length: pages }, (_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                isActive={active === i + 1}
                onClick={() => goToPage(i + 1)}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext onClick={() => goToPage(active + 1)} className={active === pages ? "pointer-events-none opacity-50" : ""}/>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* Inline styles for the blink/pulse to ensure it works regardless of global CSS */}
   

      {/* Header row: Title | Search | Add button */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">{TEXT.clients.list.title}</h3>

        {/* Search sits to the right of title and to the left of the Add button */}
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

        <div className="flex-none">
          <Button onClick={() => setCreateOpen(true)}>{TEXT.clients.list.addClient}</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => toggleSort("firstName")} className="cursor-pointer select-none">
              {TEXT.clients.list.headers.clientName} {renderSortIcon("firstName")}
            </TableHead>
            <TableHead onClick={() => toggleSort("email")} className="cursor-pointer select-none">
              {TEXT.clients.list.headers.email} {renderSortIcon("email")}
            </TableHead>
            <TableHead onClick={() => toggleSort("phone")} className="cursor-pointer select-none">
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
                <TableCell>
                  <div className="w-full">
                    {/* name is plain text now (no blue) */}
                    <span>{clientName}</span>
                  </div>
                </TableCell>
                <TableCell>{client.email ?? "-"}</TableCell>
                <TableCell>{client.phone ?? "-"}</TableCell>

                {/* balance cell hidden when hideBalance === true */}
                {!hideBalance && <TableCell>{client.balance ?? "-"}</TableCell>}

                <TableCell>{(client.isActive ?? true) ? TEXT.clients.list.statusActive : TEXT.clients.list.statusInactive}</TableCell>
                <TableCell className="flex gap-2 justify-center">
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        {renderPagination()}
      </div>

      <CreateClientDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editClient && <EditClientDialog client={editClient} onClose={() => setEditClient(null)} onUpdated={onRefresh} />}
      {deleteClient && <DeleteClientDialog client={deleteClient} onClose={() => setDeleteClient(null)} onDeleted={onRefresh} />}
    </div>
  )
}
