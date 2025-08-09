"use client"

import * as React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Input } from "@/components/ui/input"
import { Pencil, Trash, ArrowUp, ArrowDown } from "lucide-react"
import type { User } from "./types"

interface UsersTableProps {
  users: User[]
  onSelectUser: (id: number) => void
}

type SortKey = keyof Pick<User, "name" | "email">
type SortOrder = "asc" | "desc"

export default function UsersTable({ users, onSelectUser }: UsersTableProps) {
  const [page, setPage] = React.useState<number>(1)
  const [search, setSearch] = React.useState<string>("")
  const [sortKey, setSortKey] = React.useState<SortKey>("name")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc")

  const itemsPerPage = 5

  // Filtrar usuarios
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  // Ordenar usuarios
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const valA = a[sortKey].toLowerCase()
    const valB = b[sortKey].toLowerCase()
    if (valA < valB) return sortOrder === "asc" ? -1 : 1
    if (valA > valB) return sortOrder === "asc" ? 1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    setPage(1) // reset page on search/filter change
  }, [search, users.length, sortKey, sortOrder])

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)))

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null
    return sortOrder === "asc" ? (
      <ArrowUp className="inline h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="inline h-4 w-4 ml-1" />
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* Search y botón agregar */}
    <div className="flex justify-between items-center gap-4">
  <h2 className="text-lg font-semibold">Lista de usuarios</h2>
  <div className="flex items-center gap-2">
    <Input
      placeholder="Buscar..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="max-w-sm"
    />
    <Button onClick={() => alert("Agregar nuevo usuario")}>Agregar</Button>
  </div>
</div>


      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => toggleSort("name")} className="cursor-pointer select-none">
              Nombre {renderSortIcon("name")}
            </TableHead>
            <TableHead onClick={() => toggleSort("email")} className="cursor-pointer select-none">
              Correo {renderSortIcon("email")}
            </TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedUsers.length > 0 ? (
            paginatedUsers.map((user) => (
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => alert(`Editar usuario ${user.name}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      confirm(`¿Eliminar usuario ${user.name}?`) &&
                      alert(`Eliminar usuario ${user.name}`)
                    }
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-gray-500">
                No se encontraron usuarios
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Paginación */}
      {sortedUsers.length > itemsPerPage && (
        <div className="flex justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => goToPage(page - 1)}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={page === i + 1}
                    onClick={() => goToPage(i + 1)}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => goToPage(page + 1)}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
