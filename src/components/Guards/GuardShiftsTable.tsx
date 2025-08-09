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
import { Badge } from "@/components/ui/badge"
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

interface Shift {
  id: number
  status: "pendiente" | "hecho" | "cancelado"
  location: string
  date: string
}

interface GuardShiftsTableProps {
  shifts: Shift[]
  guardName: string
}

const statusColors: Record<Shift["status"], string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  hecho: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
}

export default function GuardShiftsTable({ shifts, guardName }: GuardShiftsTableProps) {
  const [page, setPage] = React.useState(1)
  const itemsPerPage = 5

  // Aseguramos al menos 1 página (aunque no haya items)
  const totalPages = Math.max(1, Math.ceil(shifts.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedShifts = shifts.slice(startIndex, startIndex + itemsPerPage)

  // Resetear a la página 1 cuando cambie el guardia o el número de turnos
  React.useEffect(() => {
    setPage(1)
  }, [guardName, shifts.length])

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p))
    setPage(next)
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* Encabezado con botón Agregar */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Turnos de {guardName}</h3>
        <Button onClick={() => alert(`Agregar turno para ${guardName}`)}>Agregar</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead>Lugar</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedShifts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">
                No hay turnos.
              </TableCell>
            </TableRow>
          ) : (
            paginatedShifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell>
                  <Badge className={statusColors[shift.status]}>
                    {shift.status}
                  </Badge>
                </TableCell>
                <TableCell>{shift.location}</TableCell>
                <TableCell>{shift.date}</TableCell>
                <TableCell className="flex gap-2 justify-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => alert(`Editar turno ${shift.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`¿Eliminar turno ${shift.id}?`)) {
                        alert(`Eliminar turno ${shift.id} (a implementar)`)
                      }
                    }}
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Paginación - alineada a la derecha */}
      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => goToPage(page - 1)}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {/* Si pocas páginas: mostrar todas */}
            {totalPages <= 6 ? (
              Array.from({ length: totalPages }, (_, i) => {
                const p = i + 1
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
              })
            ) : (
              <>
                {/* Primeras 3 páginas */}
                {[1, 2, 3].map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={page === p}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {/* Ellipsis */}
                <PaginationEllipsis />

                {/* Últimas 3 páginas */}
                {[totalPages - 2, totalPages - 1, totalPages].map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={page === p}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              </>
            )}

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
