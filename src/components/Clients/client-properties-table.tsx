// src/components/Clients/client-properties-table.tsx
"use client"

import React from "react"
import { Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"
import { toast } from "sonner"
import EditPropertyDialog from "@/components/Properties/Edit/Edit"
import DeletePropertyDialog from "@/components/Properties/Delete/Delete"

// Componente helper para texto que se adapta automáticamente
function AdaptiveText({ text, maxWidth = "150px" }: { text: string; maxWidth?: string }) {
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current && measureRef.current) {
        // Obtener el ancho máximo permitido
        const maxWidthValue = parseInt(maxWidth.replace('px', '')) || 150;
        
        // Medir el ancho real del texto
        measureRef.current.textContent = text;
        const textWidth = measureRef.current.offsetWidth;
        
        // Solo truncar si el texto es más ancho que el máximo permitido
        const shouldTruncate = textWidth > maxWidthValue;
        setIsOverflowing(shouldTruncate);
      }
    };

    checkOverflow();
    // Usar un timeout más largo para asegurar que el layout esté completamente renderizado
    const timer = setTimeout(checkOverflow, 200);
    
    return () => clearTimeout(timer);
  }, [text, maxWidth]);

  if (!text) {
    return <span>-</span>;
  }

  const content = (
    <>
      {/* Elemento invisible para medir el ancho real del texto */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 'auto',
          width: 'auto',
          whiteSpace: 'nowrap',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 'inherit'
        }}
      />
      
      {/* Elemento visible con el texto */}
      <div
        ref={textRef}
        className={isOverflowing ? "cursor-help" : ""}
        style={{ 
          maxWidth,
          overflow: isOverflowing ? 'hidden' : 'visible',
          textOverflow: isOverflowing ? 'ellipsis' : 'initial',
          whiteSpace: 'nowrap'
        }}
      >
        {text}
      </div>
    </>
  );

  if (isOverflowing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{content}</div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="whitespace-normal break-words">{text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <div>{content}</div>;
}

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
  pageSize?: number
  onPageSizeChange?: (pageSize: number) => void
}

export default function ClientPropertiesTable({ 
  properties, 
  clientName, 
  clientId, 
  onOpenCreate, 
  onRefresh,
  pageSize = 5,
  onPageSizeChange 
}: ClientPropertiesTableProps) {
  const [page, setPage] = React.useState(1)
  const itemsPerPage = pageSize
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

      {/* Header con botón CREAR y selector de page size */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {pageSize} por página
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {[5, 10, 20, 50, 100].map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => onPageSizeChange?.(size)}
                  className={pageSize === size ? "bg-accent" : ""}
                >
                  {size} por página
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Button onClick={() => onOpenCreate?.()}>
          Crear propiedad
        </Button>
      </div>

      <Table className="table-auto w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-auto min-w-[120px]">{TEXT.clients.properties.headers.name}</TableHead>
            <TableHead className="w-auto min-w-[150px]">{H.address ?? 'Address'}</TableHead>
            <TableHead className="w-auto min-w-[120px]">{H.serviceTypes ?? 'Service Types'}</TableHead>
            <TableHead className="text-center w-[100px]">{H.monthlyRate ?? 'Monthly Rate'}</TableHead>
            <TableHead className="text-center w-[90px]">{H.totalHours ?? 'Total Hours'}</TableHead>
            <TableHead className="w-[100px]">{H.startDate ?? 'Start Date'}</TableHead>
            <TableHead className="w-[100px] text-center">{TEXT.clients.properties.headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProperties.map((property) => (
            <TableRow key={property.id}>
              <TableCell className="max-w-[120px]">
                <span>{property.name}</span>
              </TableCell>
              <TableCell className="max-w-[150px]">
                <AdaptiveText text={property.address || "-"} maxWidth="150px" />
              </TableCell>
              <TableCell className="max-w-[120px]">
                <span>{(property.types_of_service ?? [])?.map((t) => (t as any)?.name).filter(Boolean).join(', ') || '-'}</span>
              </TableCell>
              <TableCell className="text-center">
                {fmtMoney((property as any).monthly_rate ?? (property as any).monthlyRate)}
              </TableCell>
              <TableCell className="text-center">{fmtNumber((property as any).total_hours ?? (property as any).totalHours)}</TableCell>
              <TableCell className="truncate max-w-[100px]">{(property as any).contract_start_date ?? (property as any).contractStartDate ?? '-'}</TableCell>
              <TableCell className="flex gap-1 justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingProperty(property)}
                  title="Editar propiedad"
                  className="h-8 w-8"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeletingProperty(property)}
                  title="Eliminar propiedad"
                  className="h-8 w-8"
                >
                  <Trash className="h-3 w-3 text-red-500" />
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
                  className="cursor-pointer"
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
