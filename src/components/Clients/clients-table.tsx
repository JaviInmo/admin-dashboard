"use client"

import React from "react"
import { Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Client {
  id: number
  name: string
  propertyCount: number
  totalPrice: number
}

interface ClientsTableProps {
  clients: Client[]
  onSelectClient: (clientId: number) => void
}

export default function ClientsTable({ clients, onSelectClient }: ClientsTableProps) {
  const [page, setPage] = React.useState(1)
  const itemsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(clients.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedClients = clients.slice(startIndex, startIndex + itemsPerPage)

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)))

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lista de Clientes</h3>
        <Button onClick={() => alert("Agregar nuevo cliente")}>Agregar</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-center"># Propiedades</TableHead>
            <TableHead className="text-center">Precio Total ($)</TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <button
                  onClick={() => onSelectClient(client.id)}
                  className="text-blue-600 hover:underline"
                >
                  {client.name}
                </button>
              </TableCell>
              <TableCell className="text-center">{client.propertyCount}</TableCell>
              <TableCell className="text-center">{client.totalPrice.toFixed(2)}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button size="icon" variant="ghost" onClick={() => alert(`Editar ${client.name}`)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => alert(`Eliminar ${client.name}`)}>
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
              <PaginationPrevious onClick={() => goToPage(page - 1)} className={page === 1 ? "opacity-50 pointer-events-none" : ""}/>
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink isActive={page === i+1} onClick={() => goToPage(i+1)}>
                  {i+1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext onClick={() => goToPage(page + 1)} className={page === totalPages ? "opacity-50 pointer-events-none" : ""}/>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
