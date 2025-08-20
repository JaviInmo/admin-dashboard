// src/components/Clients/client-properties-table.tsx
"use client"

import React from "react"
import { ClickableAddress } from "@/components/ui/clickable-address";
import { Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReusablePagination } from "@/components/ui/reusable-pagination"
import { useI18n } from "@/i18n"
import { TABLE_CONFIG } from "@/config/ui-table"
import { toast } from "sonner"
import EditPropertyDialog from "@/components/Properties/Edit/Edit"
import DeletePropertyDialog from "@/components/Properties/Delete/Delete"

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
  // adicionales que tu backend pudiera devolver
  ownerDetails?: any
  monthlyRate?: any
  totalHours?: any
  contractStartDate?: any
}

interface ClientPropertiesTableProps {
  properties: Property[]
  clientName: string
  clientId?: number
  onOpenCreate?: () => void
  // callback que el parent (client-page) pasará para refrescar la lista de propiedades
  onRefresh?: () => Promise<void> | void
}

export default function ClientPropertiesTable({ properties, clientName, clientId, onOpenCreate, onRefresh }: ClientPropertiesTableProps) {
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

  // estados para Edit / Delete
  const [editingProperty, setEditingProperty] = React.useState<Property | null>(null)
  const [deletingProperty, setDeletingProperty] = React.useState<Property | null>(null)

  const handleAfterUpdate = async () => {
    toast.success("Propiedad actualizada")
    try { await onRefresh?.() } catch {}
    setEditingProperty(null)
  }

  const handleAfterDelete = async () => {
    toast.success("Propiedad eliminada")
    try { await onRefresh?.() } catch {}
    setDeletingProperty(null)
  }

  return (
    // usamos data-attributes con clientName/clientId para que TypeScript ya no marque las props como "sin usar"
    <div
      data-client-name={clientName ?? ""}
      data-client-id={typeof clientId !== "undefined" ? String(clientId) : ""}
      className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4"
    >
      {/* title removed from here to avoid duplication; parent shows "Propiedades de ..." */}

      {/* botón CREAR dentro de la tarjeta / arriba a la derecha */}
      <div className="flex items-center justify-end mb-2">
        <Button onClick={() => onOpenCreate?.()}>
          Crear propiedad
        </Button>
      </div>

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
              <TableCell><ClickableAddress address={property.address ?? "-"} /></TableCell>
              <TableCell>{(property.types_of_service ?? [])?.map((t) => (t as any)?.name).filter(Boolean).join(', ') || '-'}</TableCell>
              <TableCell className="text-center">
                {fmtMoney((property as any).monthly_rate ?? (property as any).monthlyRate)}
              </TableCell>
              <TableCell className="text-center">{fmtNumber((property as any).total_hours ?? (property as any).totalHours)}</TableCell>
              <TableCell>{(property as any).contract_start_date ?? (property as any).contractStartDate ?? '-'}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingProperty(property)}
                  title="Editar propiedad"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeletingProperty(property)}
                  title="Eliminar propiedad"
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Paginación */}
      <div className="flex justify-center">
        <ReusablePagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={goToPage}
          showFirstLast={true}
          showPageInfo={true}
          pageInfoText={(current, total) => `Página ${current} de ${total}`}
        />
      </div>

      {/* Edit dialog */}
      {editingProperty && (
        <EditPropertyDialog
          property={editingProperty as any}
          onClose={() => setEditingProperty(null)}
          onUpdated={handleAfterUpdate}
        />
      )}

      {/* Delete dialog */}
      {deletingProperty && (
        <DeletePropertyDialog
          property={deletingProperty as any}
          onClose={() => setDeletingProperty(null)}
          onDeleted={handleAfterDelete}
        />
      )}
    </div>
  )
}
