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
import { useI18n } from "@/i18n"
import { TABLE_CONFIG } from "@/config/ui-table"
import { toast } from 'sonner'

interface Property {
  id: number
  name: string
  address?: string | null
  types_of_service?: { id: number; name: string }[] | null
  monthly_rate?: number | string | null
  contract_start_date?: string | null
  total_hours?: number | string | null
  owner?: number
  owner_details?: Record<string, unknown> | null
}

interface ClientPropertiesTableProps {
  properties: Property[]
  clientName: string
}

export default function ClientPropertiesTable({ properties, clientName }: ClientPropertiesTableProps) {
  const [page, setPage] = React.useState(1)
  const itemsPerPage = TABLE_CONFIG.itemsPerPage
  const totalPages = Math.max(1, Math.ceil(properties.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedProperties = properties.slice(startIndex, startIndex + itemsPerPage)
  const { TEXT } = useI18n()

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)))

  const fmtMoney = (v: unknown): string => {
    const n = Number(v)
    return Number.isFinite(n) ? n.toFixed(2) : "-"
  }

  const fmtNumber = (v: unknown): string => {
    const n = Number(v)
    return Number.isFinite(n) ? String(n) : "-"
  }

  const H = (TEXT as any)?.clients?.properties?.headers ?? {}

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">{TEXT.clients.properties.title.replace("{clientName}", clientName)}</h3>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TEXT.clients.properties.headers.name}</TableHead>
            <TableHead>{H.address ?? 'Address'}</TableHead>
            <TableHead>{H.serviceTypes ?? 'Service Types'}</TableHead>
            <TableHead className="text-center">{H.monthlyRate ?? 'Monthly Rate'}</TableHead>
            <TableHead className="text-center">{H.totalHours ?? 'Total Hours'}</TableHead>
            <TableHead>{H.startDate ?? 'Start Date'}</TableHead>
            <TableHead className="w-[100px] text-center">{TEXT.clients.properties.headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProperties.map((property) => (
            <TableRow key={property.id}>
              <TableCell>{property.name}</TableCell>
              <TableCell>{property.address ?? '-'}</TableCell>
              <TableCell>{(property.types_of_service ?? [])?.map((t) => t?.name).filter(Boolean).join(', ') || '-'}</TableCell>
              <TableCell className="text-center">{fmtMoney(property.monthly_rate)}</TableCell>
              <TableCell className="text-center">{fmtNumber(property.total_hours)}</TableCell>
              <TableCell>{property.contract_start_date ?? '-'}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toast.info(TEXT.clients.properties.actionEdit.replace("{name}", property.name))}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toast.warning(TEXT.clients.properties.actionDelete.replace("{name}", property.name))}
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
                className={page === 1 ? "opacity-50 pointer-events-none" : ""}
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
                className={page === totalPages ? "opacity-50 pointer-events-none" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
