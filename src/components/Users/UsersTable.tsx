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
import type { User, Permissions } from "./types"
import CreateUserDialog from "./Create/Create"
import EditUserDialog from "./Edit/Edit"
import DeleteUserDialog from "./Delete/Delete"
import { ClickableEmail } from "@/components/ui/clickable-email"

export interface UsersTableProps {
  users: (User & { permissions?: Permissions })[]
  onSelectUser: (id: number) => void
  onRefresh?: () => Promise<void>
  serverSide?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  pageSize?: number
  onSearch?: (term: string) => void
  onPageSizeChange?: (pageSize: number) => void
}

export default function UsersTable({
  users,
  onSelectUser,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onSearch,
  onPageSizeChange
}: UsersTableProps) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<keyof User>("username")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<User & { permissions?: Permissions } | null>(null)
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null)

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

  const normalizedUsers = users.map(u => ({
    ...u,
    firstName: u.firstName ?? (u.name ? u.name.split(" ").slice(0, -1).join(" ") || u.name : ""),
    lastName: u.lastName ?? (u.name ? u.name.split(" ").slice(-1).join("") : ""),
  } as User))

  const localFilteredAndSorted = normalizedUsers
    .filter((u) => {
      const q = search.toLowerCase()
      return (
        (u.username ?? "").toLowerCase().includes(q) ||
        (u.firstName ?? "").toLowerCase().includes(q) ||
        (u.lastName ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const valA = (a[sortField] ?? "") as unknown as string
      const valB = (b[sortField] ?? "") as unknown as string
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })

  const effectiveList = serverSide ? normalizedUsers : localFilteredAndSorted
  const localTotalPages = Math.max(1, Math.ceil(localFilteredAndSorted.length / itemsPerPage))
  const effectiveTotalPages = serverSide ? Math.max(1, totalPages ?? 1) : localTotalPages
  const effectivePage = serverSide ? Math.max(1, Math.min(currentPage, effectiveTotalPages)) : page
  const startIndex = (effectivePage - 1) * itemsPerPage
  const paginatedUsers = serverSide ? effectiveList : effectiveList.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    if (!serverSide) setPage(1)
  }, [users.length, search, serverSide])

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

  const toggleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: keyof User) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    )
  }

  const renderRoleText = (u: User) => {
    if ((u as any).is_superuser || u.isSuperuser) return "Superuser"
    if ((u as any).is_staff || u.isStaff) return "Staff"
    return "Usuario"
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* estilos inline para animación del search */}
    

      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">Lista de Usuarios</h3>
        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div className={`${highlightSearch ? "search-highlight search-pulse" : ""}`} style={{ minWidth: 280 }}>
            <Input
              ref={searchRef}
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label="Buscar usuarios"
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
            <TableHead onClick={() => toggleSort("username")} className="cursor-pointer select-none">
              Username {renderSortIcon("username")}
            </TableHead>
            <TableHead onClick={() => toggleSort("firstName")} className="cursor-pointer select-none">
              Nombre {renderSortIcon("firstName")}
            </TableHead>
            <TableHead onClick={() => toggleSort("lastName")} className="cursor-pointer select-none">
              Apellido {renderSortIcon("lastName")}
            </TableHead>
            <TableHead onClick={() => toggleSort("email")} className="cursor-pointer select-none">
              Correo {renderSortIcon("email")}
            </TableHead>
            <TableHead className="w-[120px]">Estado</TableHead>
            <TableHead className="w-[120px]">Rol</TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <button
                  onClick={() => onSelectUser(user.id)}
                  className="text-blue-600 hover:underline"
                >
                  {user.username}
                </button>
              </TableCell>
              <TableCell>{user.firstName}</TableCell>
              <TableCell>{user.lastName}</TableCell>
              <TableCell>
                <ClickableEmail email={user.email} />
              </TableCell>
              <TableCell>{(user as any).is_active ?? (user.isActive ?? true) ? "Activo" : "Inactivo"}</TableCell>
              <TableCell>{renderRoleText(user)}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button size="icon" variant="ghost" onClick={() => setEditUser(user)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteUser(user)}>
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
            {Array.from({ length: effectiveTotalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink 
                  isActive={effectivePage === i + 1} 
                  onClick={() => goToPage(i + 1)}
                  className="cursor-pointer"
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext onClick={() => goToPage(effectivePage + 1)} className={effectivePage === effectiveTotalPages ? "pointer-events-none opacity-50" : ""}/>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editUser && <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onUpdated={onRefresh} />}
      {deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={onRefresh} />}
    </div>
  )
}
