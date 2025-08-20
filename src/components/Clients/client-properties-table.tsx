// src/components/Clients/client-properties-table.tsx
"use client"

import React from "react"
import { ClickableAddress } from "@/components/ui/clickable-address";
import { Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n"
import { toast } from "sonner"
import EditPropertyDialog from "@/components/Properties/Edit/Edit"
import DeletePropertyDialog from "@/components/Properties/Delete/Delete"

interface Property {
  id: number
  name: string
  alias?: string | null
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

export default function ClientPropertiesTable({ 
  properties, 
  clientName, 
  clientId, 
  onOpenCreate, 
  onRefresh 
}: ClientPropertiesTableProps) {
  const { TEXT } = useI18n()
  
  const [editProperty, setEditProperty] = React.useState<Property | null>(null)
  const [deleteProperty, setDeleteProperty] = React.useState<Property | null>(null)

  // Headers helper - usar headers de properties.table
  const H = TEXT.properties?.table?.headers || {}

  // Definir las columnas de la tabla - address (índice 2) será sacrificado
  const columns: Column<Property>[] = [
    {
      key: "alias",
      label: "Alias",
      sortable: false,
      render: (property) => property.alias || "-",
    },
    {
      key: "name",
      label: TEXT.clients.properties.headers.name,
      sortable: false,
      render: (property) => property.name || "-",
    },
    {
      key: "address",
      label: H.address ?? 'Address', // Esta columna se sacrificará
      sortable: false,
      render: (property) => (
        <ClickableAddress address={property.address || ""} />
      ),
    },
    {
      key: "types_of_service" as keyof Property,
      label: H.serviceTypes ?? 'Service Types',
      sortable: false,
      render: (property) => {
        const serviceTypes = property.types_of_service;
        if (!serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
          return "-";
        }
        return serviceTypes.map(st => st.name).join(", ");
      },
    },
    {
      key: "monthly_rate" as keyof Property,
      label: H.monthlyRate ?? 'Monthly Rate',
      sortable: false,
      className: "text-center",
      render: (property) => {
        const rate = property.monthly_rate ?? property.monthlyRate;
        if (!rate) return "-";
        const numRate = typeof rate === 'string' ? parseFloat(rate) : rate;
        return !isNaN(numRate) ? `$${numRate.toFixed(2)}` : String(rate);
      },
    },
    {
      key: "total_hours" as keyof Property,
      label: H.totalHours ?? 'Total Hours',
      sortable: false,
      className: "text-center",
      render: (property) => {
        const hours = property.total_hours ?? property.totalHours;
        return hours ? String(hours) : "-";
      },
    },
  ];

  // Campos de búsqueda
  const searchFields: (keyof Property)[] = ["name", "alias", "address"];

  // Acciones de fila
  const renderActions = (property: Property) => (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setEditProperty(property);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteProperty(property);
        }}
      >
        <Trash className="h-4 w-4 text-red-500" />
      </Button>
    </>
  );

  const handlePropertySelect = (id: string | number) => {
    // Esta tabla no tiene selección específica en la implementación original
    // Pero podemos agregar una acción aquí si fuera necesario
    console.log('Property selected:', id);
  };

  return (
    <>
      <ReusableTable
        data={properties}
        columns={columns}
        getItemId={(property) => property.id}
        onSelectItem={handlePropertySelect}
        title={`${TEXT.clients.properties.title} - ${clientName}`}
        searchPlaceholder={"Buscar propiedades..."}
        addButtonText={"Agregar Propiedad"}
        onAddClick={onOpenCreate}
        serverSide={false}
        currentPage={1}
        totalPages={1}
        pageSize={5}
        searchFields={searchFields}
        actions={renderActions}
      />

      {editProperty && (
        <EditPropertyDialog
          property={editProperty as any}
          open={!!editProperty}
          onClose={() => setEditProperty(null)}
          onUpdated={async () => {
            setEditProperty(null)
            if (onRefresh) {
              try {
                await onRefresh()
                toast.success("Property updated successfully")
              } catch (error) {
                toast.error("Failed to refresh properties")
              }
            }
          }}
        />
      )}

      {deleteProperty && (
        <DeletePropertyDialog
          property={deleteProperty as any}
          open={!!deleteProperty}
          onClose={() => setDeleteProperty(null)}
          onDeleted={async () => {
            setDeleteProperty(null)
            if (onRefresh) {
              try {
                await onRefresh()
                toast.success("Property deleted successfully")
              } catch (error) {
                toast.error("Failed to refresh properties")
              }
            }
          }}
        />
      )}
    </>
  )
}
