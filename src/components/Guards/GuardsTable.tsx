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

interface Guard {
  id: number
  name: string
  price: number
}

interface GuardsTableProps {
  guards: Guard[]
  onSelectGuard: (guardId: number) => void
}

export default function GuardsTable({ guards, onSelectGuard }: GuardsTableProps) {
  const [page, setPage] = React.useState(1)
  const itemsPerPage = 5

  const startIndex = (page - 1) * itemsPerPage
  const paginatedGuards = guards.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Precio/Hora ($)</TableHead>
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
              <TableCell>{guard.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Paginador */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page}
        </span>
        <Button
          variant="outline"
          disabled={startIndex + itemsPerPage >= guards.length}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
