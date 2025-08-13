"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Pencil, Trash, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { AppClient } from "@/lib/services/clients"
import CreateClientDialog from "./Create/Create"
import EditClientDialog from "./Edit/Edit"
import DeleteClientDialog from "./Delete/Delete"

export interface ClientsTableProps {
  clients: AppClient[]
  onSelectClient: (id: number) => void
  onRefresh?: () => Promise<void>
}

export default function ClientsTable({ clients, onSelectClient, onRefresh }: ClientsTableProps) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  // default sort by first name (we treat "Client Name" as firstName + lastName)
  const [sortField, setSortField] = React.useState<keyof AppClient>("firstName")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editClient, setEditClient] = React.useState<AppClient | null>(null)
  const [deleteClient, setDeleteClient] = React.useState<AppClient | null>(null)

  const itemsPerPage = 5

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

  const filteredClients = normalizedClients
    .filter((c) => {
      const q = search.toLowerCase()
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

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    setPage(1)
  }, [clients.length, search])

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

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)))

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

  const formatDate = (iso?: string) => {
    if (!iso) return "-"
    try {
      const d = new Date(iso)
      return d.toLocaleDateString() + " " + d.toLocaleTimeString()
    } catch {
      return iso
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* Inline styles for the blink/pulse to ensure it works regardless of global CSS */}
      <style>{`
        @keyframes search-blink {
          0% { box-shadow: 0 0 0 rgba(59,130,246,0); transform: scale(1); }
          25% { box-shadow: 0 0 18px rgba(59,130,246,0.28); transform: scale(1.01); }
          50% { box-shadow: 0 0 0 rgba(59,130,246,0); transform: scale(1); }
          75% { box-shadow: 0 0 18px rgba(59,130,246,0.28); transform: scale(1.01); }
          100% { box-shadow: 0 0 0 rgba(59,130,246,0); transform: scale(1); }
        }
        .search-highlight {
          animation: search-blink 0.8s ease-in-out 4;
          border-radius: 8px;
        }
        /* small subtle pulse while still highlighted */
        @keyframes search-pulse {
          0% { box-shadow: 0 0 0 rgba(59,130,246,0.15); }
          50% { box-shadow: 0 0 20px rgba(59,130,246,0.22); }
          100% { box-shadow: 0 0 0 rgba(59,130,246,0.15); }
        }
        .search-pulse {
          animation: search-pulse 1.6s ease-in-out 2;
        }
      `}</style>

      {/* Header row: Title | Search | Add button */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">Clients List</h3>

        {/* Search sits to the right of title and to the left of the Add button */}
        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div className={`${highlightSearch ? "search-highlight search-pulse" : ""}`} style={{ minWidth: 280 }}>
            <Input
              ref={searchRef}
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label="Search clients"
            />
          </div>
        </div>

        <div className="flex-none">
          <Button onClick={() => setCreateOpen(true)}>Add Client</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => toggleSort("firstName")} className="cursor-pointer select-none">
              Client Name {renderSortIcon("firstName")}
            </TableHead>
            <TableHead onClick={() => toggleSort("email")} className="cursor-pointer select-none">
              Email {renderSortIcon("email")}
            </TableHead>
            <TableHead onClick={() => toggleSort("phone")} className="cursor-pointer select-none">
              Phone {renderSortIcon("phone")}
            </TableHead>
            <TableHead onClick={() => toggleSort("balance")} className="cursor-pointer select-none">
              Balance {renderSortIcon("balance")}
            </TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedClients.map((client) => {
            const clientName = ((client as any).clientName ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()) || "-"
            return (
              <TableRow key={client.id}>
                <TableCell>
                  <button
                    onClick={() => onSelectClient(client.id)}
                    className="text-blue-600 hover:underline"
                  >
                    {clientName}
                  </button>
                </TableCell>
                <TableCell>{client.email ?? "-"}</TableCell>
                <TableCell>{client.phone ?? "-"}</TableCell>
                <TableCell>{client.balance ?? "-"}</TableCell>
                <TableCell>{client.isActive ?? true ? "Active" : "Inactive"}</TableCell>
                <TableCell className="flex gap-2 justify-center">
                  <Button size="icon" variant="ghost" onClick={() => setEditClient(client)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteClient(client)}>
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => goToPage(page - 1)} className={page === 1 ? "pointer-events-none opacity-50" : ""}/>
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink isActive={page === i + 1} onClick={() => goToPage(i + 1)}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext onClick={() => goToPage(page + 1)} className={page === totalPages ? "pointer-events-none opacity-50" : ""}/>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <CreateClientDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editClient && <EditClientDialog client={editClient} onClose={() => setEditClient(null)} onUpdated={onRefresh} />}
      {deleteClient && <DeleteClientDialog client={deleteClient} onClose={() => setDeleteClient(null)} onDeleted={onRefresh} />}
    </div>
  )
}
