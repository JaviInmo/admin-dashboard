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

interface UsersTableProps {
  users: (User & { permissions?: Permissions })[]
  onSelectUser: (id: number) => void
}

export default function UsersTable({ users, onSelectUser }: UsersTableProps) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<keyof User>("name")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editUser, setEditUser] = React.useState<User & { permissions?: Permissions } | null>(null)
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null)

  const itemsPerPage = 5

  const filteredUsers = users
    .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const valA = a[sortField] ?? ""
      const valB = b[sortField] ?? ""
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

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lista de Usuarios</h3>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Button onClick={() => setCreateOpen(true)}>Agregar</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              onClick={() => toggleSort("name")}
              className="cursor-pointer select-none"
            >
              Nombre {renderSortIcon("name")}
            </TableHead>
            <TableHead
              onClick={() => toggleSort("email")}
              className="cursor-pointer select-none"
            >
              Correo {renderSortIcon("email")}
            </TableHead>
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
                  {user.name}
                </button>
              </TableCell>
              <TableCell>{user.email}</TableCell>
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

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editUser && <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />}
      {deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} />}
    </div>
  )
}
