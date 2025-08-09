"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { Pencil, Trash } from "lucide-react"

interface Guard {
  id: number
  name: string
  price: number // Precio por hora
  hours: number // Horas trabajadas
}

interface GuardsTableProps {
  guards: Guard[]
  onSelectGuard: (guardId: number) => void
}

export default function GuardsTable({ guards, onSelectGuard }: GuardsTableProps) {
  const [page, setPage] = React.useState(1)
  const itemsPerPage = 5

  const totalPages = Math.ceil(guards.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const paginatedGuards = guards.slice(startIndex, startIndex + itemsPerPage)

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p)
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* Encabezado con botón Agregar */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lista de Guardias</h3>
        <Button onClick={() => alert("Agregar nuevo guardia")}>Agregar</Button>
      </div>

      {/* Tabla */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Precio/Hora ($)</TableHead>
            <TableHead>Horas trabajadas</TableHead>
            <TableHead>Salario ($)</TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedGuards.map((guard) => (
            <TableRow key={guard.id}>
              <TableCell>
                <button
                  onClick={() => onSelectGuard(guard.id)}
                  className="text-blue-600 hover:underline"
                >
                  {guard.name}
                </button>
              </TableCell>
              <TableCell>{guard.price.toFixed(2)}</TableCell>
              <TableCell>{guard.hours}</TableCell>
              <TableCell>{(guard.price * guard.hours).toFixed(2)}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => alert(`Editar guardia ${guard.name}`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => alert(`Eliminar guardia ${guard.name}`)}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Paginación */}
      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => goToPage(page - 1)}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {[...Array(Math.min(3, totalPages))].map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={page === i + 1}
                  onClick={() => goToPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            {totalPages > 6 && <PaginationEllipsis />}

            {totalPages > 3 &&
              [...Array(3)].map((_, i) => {
                const p = totalPages - 2 + i
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={page === p}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}

            <PaginationItem>
              <PaginationNext
                onClick={() => goToPage(page + 1)}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
