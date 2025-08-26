"use client";

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
  ownerDetails?: any
  monthlyRate?: any
  totalHours?: any
  contractStartDate?: any
}

interface ClientPropertiesTableProps {
  properties: Property[]
  clientId?: number
  onOpenCreate?: () => void
  onRefresh?: () => Promise<void> | void
}

export default function ClientPropertiesTable({
  properties,
  onOpenCreate,
  onRefresh
}: ClientPropertiesTableProps) {
  const { TEXT, lang } = useI18n()

  const [editProperty, setEditProperty] = React.useState<Property | null>(null)
  const [deleteProperty, setDeleteProperty] = React.useState<Property | null>(null)

  // Headers helper (debe existir en ui-text.*)
  const H = TEXT.properties?.table?.headers ?? {}

  // Table labels (from TEXT)
  const tableTitle = TEXT.properties?.table?.title ?? ""
  const searchPlaceholder = TEXT.properties?.table?.searchPlaceholder ?? ""
  const addButtonText = TEXT.properties?.table?.add ?? ""

  const columns: Column<Property>[] = [
    {
      key: "alias",
      // Si el idioma es inglés queremos que muestre "Nick"
      label: lang === "en" ? "Nick" : (H.alias ?? ""),
      sortable: false,
      render: (property) => property.alias || "-",
    },
    {
      key: "name",
      label: H.name ?? "",
      sortable: false,
      render: (property) => property.name || "-",
    },
    {
      key: "address",
      label: H.address ?? "",
      sortable: false,
      render: (property) => <ClickableAddress address={property.address || ""} />,
    },
    {
      key: "types_of_service" as keyof Property,
      label: H.serviceTypes ?? "",
      sortable: false,
      render: (property) => {
        const serviceTypes = property.types_of_service;
        if (!serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) return "-";
        return serviceTypes.map(st => st.name).join(", ");
      },
    },
    {
      key: "monthly_rate" as keyof Property,
      label: H.monthlyRate ?? "",
      sortable: false,
      className: "text-center",
      render: (property) => {
        const rate = property.monthly_rate ?? property.monthlyRate;
        if (rate === null || rate === undefined || rate === "") return "-";
        const numRate = typeof rate === "string" ? parseFloat(rate) : (Number.isFinite(rate) ? rate : NaN);
        return !isNaN(numRate) ? `$${numRate.toFixed(2)}` : String(rate);
      },
    },
    {
      key: "total_hours" as keyof Property,
      label: H.totalHours ?? "",
      sortable: false,
      className: "text-center",
      render: (property) => {
        const hours = property.total_hours ?? property.totalHours;
        return (hours === 0 || hours === "0") ? "0" : (hours ? String(hours) : "-");
      },
    },
  ];

  const searchFields: (keyof Property)[] = ["name", "alias", "address"];

  const formatTemplate = (template?: string, property?: Property) => {
    if (!template) return "";
    const name = property?.name ?? property?.alias ?? String(property?.id ?? "");
    return template.replace("{name}", name);
  };

  const renderActions = (property: Property) => {
    const editTemplate = TEXT.properties?.table?.actionEdit ?? ""
    const deleteTemplate = TEXT.properties?.table?.actionDelete ?? ""

    return (
      <>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setEditProperty(property); }}
          aria-label={formatTemplate(editTemplate, property)}
          title={formatTemplate(editTemplate, property)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); setDeleteProperty(property); }}
          aria-label={formatTemplate(deleteTemplate, property)}
          title={formatTemplate(deleteTemplate, property)}
        >
          <Trash className="h-4 w-4 text-red-500" />
        </Button>
      </>
    );
  };

  const handlePropertySelect = (id: string | number) => {
    console.log("Property selected:", id);
  };

  return (
    <>
      <ReusableTable
        data={properties}
        columns={columns}
        getItemId={(p) => p.id}
        onSelectItem={handlePropertySelect}
        title={tableTitle}
        searchPlaceholder={searchPlaceholder}
        addButtonText={addButtonText}
        onAddClick={onOpenCreate}
        serverSide={false}
        currentPage={1}
        totalPages={1}
        pageSize={5}
        searchFields={searchFields}
        actions={renderActions}
        actionsHeader={TEXT.properties?.table?.headers?.actions ?? "Actions"}
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
                toast.success(TEXT.properties?.form?.success ?? "")
              } catch (err) {
                toast.error(TEXT.properties?.form?.errorRefresh ?? "")
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
                toast.success(TEXT.properties?.form?.delete?.success ?? "")
              } catch (err) {
                toast.error(TEXT.properties?.form?.delete?.errorRefresh ?? "")
              }
            }
          }}
        />
      )}
    </>
  )
}
