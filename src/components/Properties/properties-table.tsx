"use client";

import { Pencil, Trash, User, List, MoreHorizontal, Calendar, FileText, Plus } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import OwnerDetailsModal from "@/components/Properties/OwnerDetailsModal";
import PropertyDetailsModal from "@/components/Properties/PropertyDetailsModal";
import PropertiesServicesModal from "@/components/Properties/PropertiesServicesModal";
import PropertyShiftsModal from "@/components/Properties/properties shifts content/PropertyShiftsModal";

/* Modal externo de notas */
import PropertyNotesModal from "./PropertyNotesModal";
import CreateNote from "@/components/Notes/Create/CreateNote";
import type { AppClient } from "@/lib/services/clients";

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

  sortField: keyof AppProperty;
  sortOrder: SortOrder;
  toggleSort: (field: keyof AppProperty | "ownerName") => void;

  isPageLoading?: boolean;
}

type PropertyRow = AppProperty & {
  ownerName?: string;
  ownerDetails?: unknown;
  ownerId?: number | string | undefined;
};

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
  sortField,
  sortOrder,
  toggleSort,
  isPageLoading = false,
}: PropertiesTableProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editProperty, setEditProperty] = React.useState<PropertyRow | null>(null);
  const [deleteProperty, setDeleteProperty] = React.useState<PropertyRow | null>(null);
  const { TEXT } = useI18n();

  // Owner modal state (strongly typed)
  const [ownerModalOpen, setOwnerModalOpen] = React.useState(false);
  const [ownerToShow, setOwnerToShow] = React.useState<number | null>(null);
  const [ownerInitialData, setOwnerInitialData] = React.useState<unknown | undefined>(undefined);

  // Property details modal
  const [propertyDetailsOpen, setPropertyDetailsOpen] = React.useState(false);
  const [propertyToShow, setPropertyToShow] = React.useState<PropertyRow | null>(null);

  // Services / Shifts modals
  const [shiftProperty, setShiftProperty] = React.useState<PropertyRow | null>(null);
  const [servicesProperty, setServicesProperty] = React.useState<PropertyRow | null>(null);

  // Notes: property to view notes (open modal) and quick-create note
  const [notesProperty, setNotesProperty] = React.useState<PropertyRow | null>(null);
  const [createNoteProperty, setCreateNoteProperty] = React.useState<PropertyRow | null>(null);

  // local setting: actions grouped
  const [isActionsGrouped, setIsActionsGrouped] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('properties-table-actions-grouped');
      return saved ? JSON.parse(saved) as boolean : true;
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('properties-table-actions-grouped', JSON.stringify(isActionsGrouped));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // noop
    }
  }, [isActionsGrouped]);

  // Safe text getter without using `any`
  function getText(path: string, fallback?: string) {
    const parts = path.split(".");
    let val: unknown = TEXT;
    for (const p of parts) {
      if (val && typeof val === "object" && (p in (val as Record<string, unknown>))) {
        val = (val as Record<string, unknown>)[p];
      } else {
        val = undefined;
        break;
      }
    }
    if (typeof val === "string") return val;
    return fallback ?? path;
  }

  // Normalize properties: create ownerName and ownerId in a typed manner
  const normalizedProperties: PropertyRow[] = properties.map((p) => {
    const ownerDetails: unknown = (p as unknown as Record<string, unknown>).ownerDetails ?? {};
    let ownerName = "";

    const usernameCandidates = [
      (ownerDetails as Record<string, unknown>)?.username,
      (ownerDetails as Record<string, unknown>)?.user_username,
      (ownerDetails as Record<string, unknown>)?.user_name,
    ];

    for (const cand of usernameCandidates) {
      if (typeof cand === "string" && cand.trim() !== "") {
        ownerName = cand.trim();
        break;
      }
    }

    if (!ownerName) {
      const first = (ownerDetails as Record<string, unknown>)?.first_name ?? (ownerDetails as Record<string, unknown>)?.firstName ?? "";
      const last = (ownerDetails as Record<string, unknown>)?.last_name ?? (ownerDetails as Record<string, unknown>)?.lastName ?? "";
      if ((typeof first === "string" && first.trim() !== "") || (typeof last === "string" && last.trim() !== "")) {
        ownerName = `${String(first).trim()} ${String(last).trim()}`.trim();
      }
    }

    if (!ownerName) {
      const userVal = (ownerDetails as Record<string, unknown>)?.user;
      if (typeof userVal === "number") ownerName = `#${userVal}`;
      if (!ownerName && typeof userVal === "string" && userVal.trim() !== "") ownerName = userVal.trim();
    }

    const ownerIdCandidate = (p as unknown as Record<string, unknown>)?.ownerId ?? (p as unknown as Record<string, unknown>)?.owner ?? undefined;
    const ownerId = typeof ownerIdCandidate === "number" ? ownerIdCandidate : (typeof ownerIdCandidate === "string" && ownerIdCandidate.trim() !== "" ? ownerIdCandidate : undefined);

    if (!ownerName) {
      if (ownerId !== undefined) ownerName = `#${ownerId}`;
      else ownerName = `#${(p as unknown as Record<string, unknown>)?.id ?? ""}`;
    }

    return {
      ...p,
      ownerName,
      ownerDetails,
      ownerId,
    } as PropertyRow;
  });

  // columns typed with PropertyRow
  const columns: Column<PropertyRow>[] = [
    {
      key: "ownerId",
      label: getText("properties.table.headers.owner", "Owner"),
      sortable: true,
      render: (p) => {
        const ownerIdVal = p.ownerId ?? undefined;
        const ownerLabel = p.ownerName ?? (ownerIdVal ? `#${ownerIdVal}` : "-");
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
      render: (p) => <TruncatedText text={String(p.alias ?? "-")} maxLength={15} />,
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "100px", minWidth: "80px", maxWidth: "120px" },
      cellStyle: { width: "100px", minWidth: "80px", maxWidth: "120px" },
    },
    {
      key: "name",
      label: getText("properties.table.headers.name", "Name"),
      sortable: true,
      render: (p) => <TruncatedText text={String(p.name ?? "")} maxLength={20} />,
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "120px", minWidth: "100px", maxWidth: "150px" },
      cellStyle: { width: "120px", minWidth: "100px", maxWidth: "150px" },
    },
    {
      key: "address",
      label: getText("properties.table.headers.address", "Address"),
      sortable: true,
      render: (p) => <ClickableAddress address={String(p.address ?? "")} />,
      headerClassName: "px-1 py-1 text-sm",
      cellClassName: "px-1 py-1 text-sm",
      headerStyle: { width: "150px", minWidth: "120px", maxWidth: "200px" },
      cellStyle: { width: "150px", minWidth: "120px", maxWidth: "200px" },
    },
    {
      key: "contractStartDate",
      label: getText("properties.table.headers.contractStartDate", "Contract Start"),
      sortable: true,
      render: (p) => {
        const raw = (p as unknown as Record<string, unknown>)?.contractStartDate ?? (p as unknown as Record<string, unknown>)?.contract_start_date ?? null;
        if (!raw) return <span className="text-sm">-</span>;
        try {
          const d = new Date(String(raw));
          if (Number.isNaN(d.getTime())) return <span className="text-sm">{String(raw)}</span>;
          return <span className="text-sm">{d.toLocaleDateString()}</span>;
        } catch {
          return <span className="text-sm">{String(raw)}</span>;
        }
      },
      headerClassName: "px-1 py-1 text-sm text-center",
      cellClassName: "px-1 py-1 text-sm text-center",
      headerStyle: { width: "120px", minWidth: "100px", maxWidth: "140px" },
      cellStyle: { width: "120px", minWidth: "100px", maxWidth: "140px" },
    },
  ];

  const searchFields: (keyof AppProperty)[] = ["name", "alias", "address"];

  // grouped actions (menu)
  const renderGroupedActions = (property: PropertyRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setServicesProperty(property);
        }}>
          <List className="h-4 w-4 mr-2" />
          {getText("properties.table.servicesButton", "Servicios")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setShiftProperty(property);
        }}>
          <Calendar className="h-4 w-4 mr-2" />
          {getText("properties.table.shiftsButton", "Turnos")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          const ownerIdVal = property.ownerId ?? undefined;
          if (ownerIdVal !== undefined) {
            setOwnerToShow(Number(ownerIdVal));
            setOwnerInitialData(property.ownerDetails ?? undefined);
            setOwnerModalOpen(true);
          }
        }}>
          <User className="h-4 w-4 mr-2" />
          Ver propietario
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Notas: ver y crear */}
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setNotesProperty(property);
        }}>
          <FileText className="h-4 w-4 mr-2" />
          {getText("properties.table.notesButton", "Notas")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setCreateNoteProperty(property);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          {getText("properties.table.addNoteButton", "Agregar nota")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setEditProperty(property);
        }}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setDeleteProperty(property);
        }}>
          <Trash className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // row actions (expanded)
  const renderActions = (property: PropertyRow) => (
    isActionsGrouped ? renderGroupedActions(property) : (
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setServicesProperty(property);
          }}
          title={getText("properties.table.servicesButton", "Services")}
          aria-label={getText("properties.table.servicesAria", "Ver servicios de la propiedad")}
        >
          <List className="h-4 w-4" />
        </Button>

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
            const ownerIdVal = property.ownerId ?? undefined;
            if (ownerIdVal !== undefined) {
              setOwnerToShow(Number(ownerIdVal));
              setOwnerInitialData(property.ownerDetails ?? undefined);
              setOwnerModalOpen(true);
            }
          }}
          title="Ver propietario"
          aria-label="Ver propietario"
        >
          <User className="h-4 w-4" />
        </Button>

        {/* Notas: ver */}
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setNotesProperty(property);
          }}
          title={getText("properties.table.notesButton", "Notas")}
          aria-label={getText("properties.table.notesAria", "Ver notas de la propiedad")}
        >
          <FileText className="h-4 w-4" />
        </Button>

        {/* Notas: crear nota rápido */}
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setCreateNoteProperty(property);
          }}
          title={getText("properties.table.addNoteButton", "Agregar nota")}
          aria-label={getText("properties.table.addNoteAria", "Agregar nota para la propiedad")}
        >
          <Plus className="h-4 w-4" />
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
    )
  );

  return (
    <>
      <ReusableTable<PropertyRow>
        className="text-sm"
        data={normalizedProperties}
        columns={columns}
        getItemId={(p) => p.id}
        onSelectItem={(id) => {
          const property = normalizedProperties.find((x) => x.id === Number(id));
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
        sortField={sortField as keyof PropertyRow}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        actions={renderActions}
        isPageLoading={isPageLoading}
        rightControls={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsActionsGrouped(!isActionsGrouped)}
            className="text-xs"
          >
            {isActionsGrouped ? "Compacto" : "Desplegado"}
          </Button>
        }
      />

      {/* Create / Edit / Delete property dialogs */}
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

      {/* Owner modal */}
      <OwnerDetailsModal
        ownerId={ownerToShow ?? undefined}
        initialData={ownerInitialData as Partial<AppClient> | undefined}
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

      {/* Services modal */}
      {servicesProperty && (
        <PropertiesServicesModal
          propertyId={servicesProperty.id}
          propertyName={servicesProperty.name || servicesProperty.alias || `Propiedad ${servicesProperty.id}`}
          open={!!servicesProperty}
          onClose={() => setServicesProperty(null)}
          onUpdated={onRefresh}
        />
      )}

      {/* Shifts modal */}
      {shiftProperty && (
        <PropertyShiftsModal
          propertyId={shiftProperty.id}
          propertyName={shiftProperty.name}
          propertyAlias={shiftProperty.alias}
          open={!!shiftProperty}
          onClose={() => setShiftProperty(null)}
        />
         )}

      {/* Property Notes modal (external) */}
      {notesProperty && (
        <PropertyNotesModal
          property={notesProperty}
          open={!!notesProperty}
          onClose={() => setNotesProperty(null)}
          onUpdated={onRefresh}
        />
      )}

      {/* CreateNote quick dialog (autocompleta propiedad) */}
  {createNoteProperty && (
  <CreateNote
    open={!!createNoteProperty}
    onClose={() => setCreateNoteProperty(null)}
    onCreated={async () => {
      if (onRefresh) {
        const maybe = onRefresh();
        if (maybe && typeof (maybe as unknown as Promise<unknown>)?.then === "function") {
          await maybe;
        }
      }
      setCreateNoteProperty(null);
    }}
    initialPropertyId={createNoteProperty.id} // <- importante
  />
)}


    </>
  );
}
