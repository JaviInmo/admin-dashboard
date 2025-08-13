"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Pencil, Trash, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { User, Permissions } from "./types"
import CreateUserDialog from "./Create/Create"
import EditUserDialog from "./Edit/Edit"
import DeleteUserDialog from "./Delete/Delete"

export interface UsersTableProps {
  users: (User & { permissions?: Permissions })[]
  onSelectUser: (id: number) => void
  onRefresh?: () => Promise<void>
}

const sectionsOrder: Array<keyof Permissions> = ["cliente", "guardia", "ubicacion", "dashboard"]

export default function UsersTable({ users, onSelectUser, onRefresh }: UsersTableProps) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<keyof User>("username")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<User & { permissions?: Permissions } | null>(null)
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null)

  const itemsPerPage = 5

  const normalizedUsers = users.map(u => ({
    ...u,
    firstName: u.firstName ?? (u.name ? u.name.split(" ").slice(0, -1).join(" ") || u.name : ""),
    lastName: u.lastName ?? (u.name ? u.name.split(" ").slice(-1).join("") : ""),
  } as User))

  const filteredUsers = normalizedUsers
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

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    setPage(1)
  }, [users.length, search])

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)))

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

  const renderPermissions = (p?: Permissions) => {
    if (!p) {
      return <span className="text-sm text-muted-foreground">Sin permisos</span>
    }

    const actionAbbr: Record<string, string> = { create: "C", edit: "E", read: "R", delete: "D" }

    return (
      <div className="flex gap-2 flex-wrap">
        {sectionsOrder.map((section) => {
          const sectionPerms = p[section]
          if (!sectionPerms) return null
          const letters = (Object.keys(sectionPerms) as Array<keyof typeof sectionPerms>)
            .filter((act) => !!sectionPerms[act])
            .map((act) => actionAbbr[act] ?? act[0].toUpperCase())
            .join("")
          return (
            <span
              key={section}
              className="px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-800 border"
              title={`${section}: ${letters || "—"}`}
            >
              <strong className="capitalize mr-1">{section}:</strong>
              <span>{letters || "—"}</span>
            </span>
          )
        })}
      </div>
    )
  }

  const renderRoleText = (u: User) => {
    if ((u as any).is_superuser || u.isSuperuser) return "Superuser"
    if ((u as any).is_staff || u.isStaff) return "Staff"
    return "Usuario"
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lista de Usuarios</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
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
              <TableCell>{user.email}</TableCell>
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

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editUser && <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onUpdated={onRefresh} />}
      {deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={onRefresh} />}
    </div>
  )
}
