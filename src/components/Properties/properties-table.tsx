"use client";

import { Pencil, Trash, User, Calendar } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { ClickableAddress } from "@/components/ui/clickable-address";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppProperty } from "@/lib/services/properties";
import type { SortOrder } from "@/lib/sort";
import { useI18n } from "@/i18n";
import CreatePropertyDialog from "./Create/Create";
import DeletePropertyDialog from "./Delete/Delete";
import EditPropertyDialog from "./Edit/Edit";

// Nuevo: modal de detalles del propietario
import OwnerDetailsModal from "@/components/Properties/OwnerDetailsModal";
import PropertyDetailsModal from "@/components/Properties/PropertyDetailsModal";

// Nuevo: modal de turnos para propiedades - versión corregida
import PropertyShiftsModalImproved from "@/components/Properties/PropertyShiftsModalImproved";

// Componente helper para texto truncado con tooltip
function TruncatedText({
  text,
  maxLength = 30,
}: {
  text: string;
  maxLength?: number;
}) {
  if (!text || text.length <= maxLength) {
    return <span>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help truncate block max-w-[200px]">
            {text.substring(0, maxLength)}...
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="whitespace-normal break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface PropertiesTableProps {
  properties: AppProperty[];
  onRefresh?: () => Promise<void>;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (term: string) => void;
  propertyTypesMap?: Record<number, string>;

  sortField: keyof AppProperty;
  sortOrder: SortOrder;
  toggleSort: (key: keyof AppProperty) => void;

  // Loading state para paginación
  isPageLoading?: boolean;
}

export default function PropertiesTable({
  properties,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onPageSizeChange,
  onSearch,
  propertyTypesMap,
  sortField,
  sortOrder,
  toggleSort,
  isPageLoading = false,
}: PropertiesTableProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editProperty, setEditProperty] = React.useState<AppProperty | null>(null);
  const [deleteProperty, setDeleteProperty] = React.useState<AppProperty | null>(null);
  const { TEXT } = useI18n();

  // Estado para el modal de propietario
  const [ownerModalOpen, setOwnerModalOpen] = React.useState(false);
  const [ownerToShow, setOwnerToShow] = React.useState<number | null>(null);
  const [ownerInitialData, setOwnerInitialData] = React.useState<any | undefined>(undefined);

  // Estado para el modal de detalles de la propiedad
  const [propertyDetailsOpen, setPropertyDetailsOpen] = React.useState(false);
  const [propertyToShow, setPropertyToShow] = React.useState<any | null>(null);

  // Nuevo estado: property para abrir modal de Shifts
  const [shiftProperty, setShiftProperty] = React.useState<AppProperty | null>(null);

  // Safe text getter to avoid TS errors when some keys are missing
  function getText(path: string, fallback?: string) {
    const parts = path.split(".");
    let val: any = TEXT as any;
    for (const p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (typeof val === "string") return val;
    return fallback ?? path;
  }

  // Normalizar los datos de propiedades
  const normalizedProperties = properties.map((p) => {
    const od: any = (p as any).ownerDetails ?? {};
    let ownerName = "";

    // Buscar el username del propietario
    const usernameCandidates = [od.username, od.user_username, od.user_name];
    for (const cand of usernameCandidates) {
      if (typeof cand === "string" && cand.trim() !== "") {
        ownerName = cand.trim();
        break;
      }
    }

    if (!ownerName) {
      const first = od.first_name ?? od.firstName ?? "";
      const last = od.last_name ?? od.lastName ?? "";
      if ((first || last) && `${first} ${last}`.trim() !== "")
        ownerName = `${first} ${last}`.trim();
    }

    if (!ownerName) {
      if (typeof od.user === "number") ownerName = `#${od.user}`;
    }

    if (!ownerName) ownerName = `#${(p as any).ownerId ?? (p as any).owner ?? p.id}`;

    // Procesar tipos de servicio
    let typesOfServiceStr = "";
    const tos: any =
      (p as any).typesOfService ?? (p as any).types_of_service ?? [];
    if (Array.isArray(tos)) {
      typesOfServiceStr = tos
        .map((t: any) => {
          if (!t && t !== 0) return null;
          if (typeof t === "object") {
            return String(t.name ?? t.title ?? t.id ?? "");
          }
          if (typeof t === "number") {
            return propertyTypesMap?.[t] ?? String(t);
          }
          if (typeof t === "string") {
            const n = Number(t);
            if (!Number.isNaN(n)) return propertyTypesMap?.[n] ?? t;
            return t;
          }
          return null;
        })
        .filter(Boolean)
        .join(", ");
    }

    return {
      ...p,
      ownerName,
      typesOfServiceStr,
    };
  });

  // Definir las columnas de la tabla - la columna de dirección (índice 3) será sacrificada
  const columns: Column<any>[] = [
    {
      key: "ownerId",
      label: getText("properties.table.headers.owner", "Owner"),
      sortable: true,
      render: (p) => {
        const ownerIdVal = (p as any).ownerId ?? (p as any).owner ?? null;
        const ownerLabel = (p as any).ownerName ?? (ownerIdVal ? `#${ownerIdVal}` : "-");

        // Solo mostrar el texto del propietario, sin hacer clickeable
        return (
          <div className="w-full">
            <span className="text-foreground text-sm">
              {ownerLabel}
            </span>
          </div>
        );
      },
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "120px", minWidth: "100px", maxWidth: "140px" },
      cellStyle: { width: "120px", minWidth: "100px", maxWidth: "140px" },
    },
    {
      key: "alias",
      label: getText("properties.table.headers.alias", "Nick"),
      sortable: true,
      render: (p) => <TruncatedText text={p.alias || "-"} maxLength={15} />,
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "100px", minWidth: "80px", maxWidth: "120px" },
      cellStyle: { width: "100px", minWidth: "80px", maxWidth: "120px" },
    },
    {
      key: "name",
      label: getText("properties.table.headers.name", "Name"),
      sortable: true,
      render: (p) => <TruncatedText text={p.name || ""} maxLength={20} />,
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "120px", minWidth: "100px", maxWidth: "150px" },
      cellStyle: { width: "120px", minWidth: "100px", maxWidth: "150px" },
    },
    {
      key: "address",
      label: getText("properties.table.headers.address", "Address"), // Esta columna (índice 3) se truncará
      sortable: true,
      render: (p) => <ClickableAddress address={p.address || ""} />,
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "150px", minWidth: "120px", maxWidth: "200px" },
      cellStyle: { width: "150px", minWidth: "120px", maxWidth: "200px" },
    },
    {
      key: "typesOfService",
      label: getText("properties.table.headers.serviceTypes", "Service Types"),
      sortable: false,
      render: (p) => (
        <TruncatedText text={(p as any).typesOfServiceStr || "-"} maxLength={20} />
      ),
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "120px", minWidth: "100px", maxWidth: "140px" },
      cellStyle: { width: "120px", minWidth: "100px", maxWidth: "140px" },
    },
    {
      key: "monthlyRate",
      label: getText("properties.table.headers.monthlyRate", "Monthly Rate"),
      sortable: true,
      render: (p) => (
        <span className="text-sm">
          {p.monthlyRate != null && p.monthlyRate !== ""
            ? `$ ${p.monthlyRate}`
            : "-"}
        </span>
      ),
      headerClassName: "px-1 py-1 text-sm text-center",
      cellClassName: "px-1 py-1 text-sm text-right",
      headerStyle: { width: "100px", minWidth: "80px", maxWidth: "120px" },
      cellStyle: { width: "100px", minWidth: "80px", maxWidth: "120px" },
    },
    {
      key: "totalHours",
      label: getText("properties.table.headers.totalHours", "Total Hours"),
      sortable: true,
      render: (p) => <span className="text-xs">{p.totalHours ?? "-"}</span>,
      headerClassName: "px-1 py-1 text-xs text-center",
      cellClassName: "px-1 py-1 text-xs text-center",
      headerStyle: { width: "60px", minWidth: "50px", maxWidth: "70px" },
      cellStyle: { width: "60px", minWidth: "50px", maxWidth: "70px" },
    },
  ];

  // Campos de búsqueda
  const searchFields: (keyof AppProperty)[] = ["name", "alias", "address"];

  // Acciones de fila
  const renderActions = (property: AppProperty) => (
    <div className="flex items-center gap-1"> {/* gap reducido como en guardias */}
      {/* Turnos */}
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setShiftProperty(property);
        }}
        title={getText("properties.table.shiftsButton", "Turnos")}
        aria-label={getText("properties.table.shiftsAria", "Gestionar turnos de la propiedad")}
      >
        <Calendar className="h-4 w-4" />
      </Button>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          const ownerIdVal = (property as any).ownerId ?? (property as any).owner ?? null;
          if (ownerIdVal) {
            setOwnerToShow(Number(ownerIdVal));
            setOwnerInitialData((property as any).ownerDetails ?? undefined);
            setOwnerModalOpen(true);
          }
        }}
        title="Ver propietario"
        aria-label="Ver propietario"
      >
        <User className="h-4 w-4" />
      </Button>
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
    </div>
  );

  return (
    <>
      {/* Usar siempre ReusableTable con loading integrado */}
      <ReusableTable<any>
        className="text-sm" // más compacto
        data={normalizedProperties}
        columns={columns}
        getItemId={(p) => p.id}
        onSelectItem={(id) => {
          const property = normalizedProperties.find(p => p.id === Number(id));
          if (property) {
            setPropertyToShow(property);
            setPropertyDetailsOpen(true);
          }
        }}
        title={getText("properties.table.title", "Properties List")}
        searchPlaceholder={getText("properties.table.searchPlaceholder", "Search properties...")}
        addButtonText={getText("properties.table.add", "Add")}
        onAddClick={() => setCreateOpen(true)}
        serverSide={serverSide}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onSearch={onSearch}
        searchFields={searchFields}
        sortField={sortField as any}
        sortOrder={sortOrder}
        toggleSort={toggleSort as any}
        actions={renderActions}
        isPageLoading={isPageLoading}
      />

      <CreatePropertyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onRefresh}
      />
      {editProperty && (
        <EditPropertyDialog
          property={editProperty}
          open={!!editProperty}
          onClose={() => setEditProperty(null)}
          onUpdated={onRefresh}
        />
      )}
      {deleteProperty && (
        <DeletePropertyDialog
          property={deleteProperty}
          open={!!deleteProperty}
          onClose={() => setDeleteProperty(null)}
          onDeleted={onRefresh}
        />
      )}

      {/* Owner modal: pasa ownerId e initialData (si estaba incluido en la property) */}
      <OwnerDetailsModal
        ownerId={ownerToShow ?? undefined}
        initialData={ownerInitialData}
        open={ownerModalOpen}
        onClose={() => {
          setOwnerModalOpen(false);
          setOwnerToShow(null);
          setOwnerInitialData(undefined);
        }}
        onUpdated={onRefresh}
      />

      {/* Property details modal */}
      {propertyToShow && (
        <PropertyDetailsModal
          property={propertyToShow}
          open={propertyDetailsOpen}
          onClose={() => {
            setPropertyDetailsOpen(false);
            setPropertyToShow(null);
          }}
        />
      )}

      {/* Nuevo: modal de Shifts para propiedades */}
      {shiftProperty && (
        <PropertyShiftsModalImproved
          propertyId={shiftProperty.id}
          propertyName={shiftProperty.name || shiftProperty.alias || `Propiedad ${shiftProperty.id}`}
          open={!!shiftProperty}
          onClose={() => setShiftProperty(null)}
        />
      )}
    </>
  );
}
