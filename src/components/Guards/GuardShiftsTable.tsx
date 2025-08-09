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
} from "@/components/ui/pagination"
import { Pencil, Trash } from "lucide-react"

interface Shift {
  id: number
  status: "pendiente" | "hecho" | "cancelado"
  hours: number
  date: string
  location: string
  pricePerHour: number
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
  const totalPages = Math.max(1, Math.ceil(shifts.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedShifts = shifts.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    setPage(1)
  }, [guardName, shifts.length])

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)))

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Turnos de {guardName}</h3>
        <Button onClick={() => alert(`Agregar turno para ${guardName}`)}>Agregar</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead className="text-center">Horas</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Lugar</TableHead>
            <TableHead className="text-center">Precio/Hora ($)</TableHead>
            <TableHead className="text-center">Total ($)</TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedShifts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
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
                <TableCell className="text-center">{shift.hours}</TableCell>
                <TableCell>{shift.date}</TableCell>
                <TableCell>{shift.location}</TableCell>
                <TableCell className="text-center">{shift.pricePerHour.toFixed(2)}</TableCell>
                <TableCell className="text-center">{(shift.pricePerHour * shift.hours).toFixed(2)}</TableCell>
                <TableCell className="flex gap-2 justify-center">
                  <Button size="icon" variant="ghost" onClick={() => alert(`Editar turno ${shift.id}`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm(`¿Eliminar turno ${shift.id}?`) && alert(`Eliminar turno ${shift.id}`)}>
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
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
    </div>
  )
}
