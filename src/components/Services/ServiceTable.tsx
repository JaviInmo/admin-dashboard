// src/components/Services/ServiceTable.tsx
"use client";

import { Pencil, Trash, Eye, FileText, Plus, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import type { Service } from "./types";
import DeleteServiceDialog from "./Delete/Delete";
import EditServiceDialog from "./Edit/Edit";
import PropertyServiceEdit from "../Properties/PropertyServiceEdit";
import GuardServiceEdit from "../Guards/GuardServiceEdit";
import ShowServiceDialog from "./Show/Show";
import ServicesNotesModal from "./ServicesNotesModal";
import CreateNote from "@/components/Notes/Create/CreateNote";

export interface ServicesTableProps {
  services: Service[];
  onRefresh?: () => Promise<void> | void;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;

  onSearch?: (term: string) => void;

  isPageLoading?: boolean;

  sortField?: keyof Service;
  sortOrder?: SortOrder;
  toggleSort?: (key: keyof Service) => void;

  createInitialGuardId?: number | null;
  createInitialGuardLabel?: string | null;

  createInitialPropertyId?: number | null;
  createInitialPropertyLabel?: string | null;

  compact?: boolean;
  largeMode?: boolean;
  shrinkToFit?: boolean;

  context?: "property" | "guard" | "default";

  // columnsConfig puede venir parcial (p.e. { showActive: false })
  columnsConfig?: {
    showName?: boolean;
    showGuard?: boolean;
    showProperty?: boolean;
    showActive?: boolean;
  };
}

export default function ServicesTable({
  services,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onPageSizeChange,
  onSearch,
  isPageLoading = false,
  sortField,
  sortOrder,
  toggleSort,
  createInitialGuardId = null,
  createInitialGuardLabel = null,
  createInitialPropertyId = null,
  createInitialPropertyLabel = null,
  compact = false,
  largeMode = false,
  shrinkToFit = false,
  context = "default",
  columnsConfig,
}: ServicesTableProps) {
  const { TEXT } = useI18n();

  // Merge incoming columnsConfig with defaults so partial objects don't hide other flags
  const mergedColumnsConfig = React.useMemo(() => {
    return {
      showName: true,
      showGuard: true,
      showProperty: true,
      showActive: true,
      ...(columnsConfig || {}),
    };
  }, [columnsConfig]);

  const [editService, setEditService] = React.useState<Service | null>(null);
  const [deleteServiceState, setDeleteServiceState] =
    React.useState<Service | null>(null);
  const [showService, setShowService] = React.useState<Service | null>(null);

  const [createOpen, setCreateOpen] = React.useState(false);

  const [createInitialGuard, setCreateInitialGuard] = React.useState<{
    id?: number | null;
    label?: string | null;
  } | null>(null);

  const [createInitialProperty, setCreateInitialProperty] = React.useState<{
    id?: number | null;
    label?: string | null;
  } | null>(null);

  const [notesService, setNotesService] = React.useState<Service | null>(null);
  const [createNoteService, setCreateNoteService] = React.useState<Service | null>(null);

  const [isActionsGrouped, setIsActionsGrouped] = React.useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("services-table-actions-grouped") : null;
    return saved ? JSON.parse(saved) : false;
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("services-table-actions-grouped", JSON.stringify(isActionsGrouped));
    }
  }, [isActionsGrouped]);

  const createEmptyService = React.useMemo((): Service => ({
    id: 0,
    name: "",
    description: "",
    guard: createInitialGuard?.id || createInitialGuardId || null,
    guardName: createInitialGuard?.label || createInitialGuardLabel || "",
    assignedProperty: createInitialProperty?.id || createInitialPropertyId || null,
    propertyName: createInitialProperty?.label || createInitialPropertyLabel || "",
    rate: "",
    monthlyBudget: "",
    totalHours: "",
    scheduled_total_hours: "",
    contractStartDate: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    schedule: [],
    recurrent: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }), [createInitialGuard, createInitialGuardId, createInitialGuardLabel, createInitialProperty, createInitialPropertyId, createInitialPropertyLabel]);

  const tableText = TEXT?.services?.table ?? {};

  const sizeHeaderCell = compact
    ? "px-2 py-1 text-xs"
    : shrinkToFit
    ? "px-2 py-1 text-sm"
    : largeMode
    ? "px-4 py-2 text-base"
    : "px-3 py-2 text-sm";

  const iconSizeClass = compact
    ? "h-3 w-3"
    : shrinkToFit
    ? "h-4 w-4"
    : largeMode
    ? "h-5 w-5"
    : "h-4 w-4";
  const tableClass = compact
    ? "text-xs"
    : shrinkToFit
    ? "text-sm"
    : largeMode
    ? "text-base"
    : "text-sm";

  const Trunc = ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string | null;
  }) => (
    <span className="block truncate max-w-full" title={title ?? undefined}>
      {children}
    </span>
  );

  const columns: Column<Service>[] = [
    ...(mergedColumnsConfig.showName ? [{
      key: "name" as keyof Service,
      label: tableText.headers?.name ?? "Name",
      sortable: true,
      render: (s: Service) => (
        <Trunc title={s.name}>
          <span className="font-medium">{s.name}</span>
        </Trunc>
      ),
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "18%" },
      cellStyle: { width: "18%" },
    }] : []),

    ...(mergedColumnsConfig.showGuard ? [{
      key: "guardName" as keyof Service,
      label: tableText.headers?.guard ?? "Guard",
      sortable: true,
      render: (s: Service) => <Trunc title={s.guardName}>{s.guardName ?? "-"}</Trunc>,
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "15%" },
      cellStyle: { width: "15%" },
    }] : []),

    ...(mergedColumnsConfig.showProperty ? [{
      key: "propertyName" as keyof Service,
      label: tableText.headers?.property ?? "Property",
      sortable: true,
      render: (s: Service) => (
        <Trunc title={s.propertyName}>{s.propertyName ?? "-"}</Trunc>
      ),
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "15%" },
      cellStyle: { width: "15%" },
    }] : []),

    {
      key: "totalHours" as keyof Service,
      label: tableText.headers?.totalHours ?? "Cant. Hrs",
      sortable: false,
      render: (s: Service) => (
        <Trunc title={String(s.totalHours ?? null)}>{s.totalHours ?? "-"}</Trunc>
      ),
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "10%" },
      cellStyle: { width: "10%" },
    },
    {
      key: "rate" as keyof Service,
      label: tableText.headers?.rate ?? "Rate/hr",
      sortable: false,
      render: (s: Service) => (
        <Trunc title={String(s.rate ?? null)}>{s.rate ?? "-"}</Trunc>
      ),
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "10%" },
      cellStyle: { width: "10%" },
    },
    {
      key: "monthlyBudget" as keyof Service,
      label: tableText.headers?.monthlyBudget ?? "Monthly",
      sortable: false,
      render: (s: Service) => (
        <Trunc title={String(s.monthlyBudget ?? null)}>
          {s.monthlyBudget ?? "-"}
        </Trunc>
      ),
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "10%" },
      cellStyle: { width: "10%" },
    },
    {
      key: "recurrent" as keyof Service,
      label: tableText.headers?.recurrent ?? "Recurrent",
      sortable: true,
      render: (s: Service) => {
        if (s.recurrent === null || s.recurrent === undefined) return "-";
        const yes = tableText.recurrentYes ?? TEXT?.common?.yes ?? "Yes";
        const no = tableText.recurrentNo ?? TEXT?.common?.no ?? "No";
        return (
          <Trunc title={s.recurrent ? yes : no}>{s.recurrent ? yes : no}</Trunc>
        );
      },
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "10%" },
      cellStyle: { width: "10%" },
    },

    ...(mergedColumnsConfig.showActive ? [{
      key: "isActive" as keyof Service,
      label: tableText.headers?.isActive ?? "Active",
      sortable: true,
      render: (s: Service) => {
        if (s.isActive === null || s.isActive === undefined) return "-";
        const yes = tableText.activeLabel ?? TEXT?.common?.yes ?? "Yes";
        const no = tableText.inactiveLabel ?? TEXT?.common?.no ?? "No";
        return (
          <Trunc title={s.isActive ? yes : no}>{s.isActive ? yes : no}</Trunc>
        );
      },
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: { width: "8%" },
      cellStyle: { width: "8%" },
    }] : []),
  ];

  const searchFields: (keyof Service)[] = [
    ...(mergedColumnsConfig.showName ? ["name" as keyof Service] : []),
    ...(mergedColumnsConfig.showGuard ? ["guardName" as keyof Service] : []),
    ...(mergedColumnsConfig.showProperty ? ["propertyName" as keyof Service] : []),
  ];

  const renderActions = (s: Service) => (
    <div className="flex items-center gap-1 flex-wrap justify-center min-w-0">
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setShowService(s);
        }}
        title={TEXT?.actions?.view ?? "View"}
        aria-label={TEXT?.actions?.view ?? "View"}
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        <Eye className={iconSizeClass} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setNotesService(s);
        }}
        title={TEXT?.services?.table?.notesButton ?? "Notas"}
        aria-label={TEXT?.services?.table?.notesAria ?? "Ver notas del servicio"}
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        <FileText className={iconSizeClass} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setCreateNoteService(s);
        }}
        title={TEXT?.services?.table?.addNoteButton ?? "Agregar nota"}
        aria-label={TEXT?.services?.table?.addNoteAria ?? "Agregar nota para el servicio"}
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        <Plus className={iconSizeClass} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setEditService(s);
        }}
        title={TEXT?.actions?.edit ?? "Edit"}
        aria-label={TEXT?.actions?.edit ?? "Edit"}
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        <Pencil className={iconSizeClass} />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteServiceState(s);
        }}
        title={TEXT?.actions?.delete ?? "Delete"}
        aria-label={TEXT?.actions?.delete ?? "Delete"}
        className="h-8 w-8 p-0 flex-shrink-0 text-red-500 hover:text-red-600"
      >
        <Trash className={iconSizeClass} />
      </Button>
    </div>
  );

  const renderGroupedActions = (s: Service) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => e.stopPropagation()}
          title="Más"
          aria-label="Más"
        >
          <MoreHorizontal className={iconSizeClass} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setShowService(s);
          }}
        >
          <Eye className="mr-2 h-4 w-4" />
          {TEXT?.actions?.view ?? "View"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setNotesService(s);
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          {TEXT?.services?.table?.notesButton ?? "Notas"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setCreateNoteService(s);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {TEXT?.services?.table?.addNoteButton ?? "Agregar nota"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setEditService(s);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {TEXT?.actions?.edit ?? "Edit"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setDeleteServiceState(s);
          }}
          className="text-red-600"
        >
          <Trash className="mr-2 h-4 w-4" />
          {TEXT?.actions?.delete ?? "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="w-full overflow-auto">
        <div
          className={shrinkToFit ? "w-full" : largeMode ? "min-w-[1200px]" : "min-w-[1000px]"}
        >
          <ReusableTable
            className={`${tableClass} ${shrinkToFit ? "table-fixed" : ""}`}
            data={services}
            columns={columns}
            getItemId={(s) => s.id}
            onSelectItem={(id) => {
              const found = services.find((x) => x.id === Number(id));
              if (found) setShowService(found);
            }}
            title={tableText.title ?? TEXT?.services?.title ?? "Services"}
            searchPlaceholder={
              tableText.searchPlaceholder ??
              TEXT?.services?.searchPlaceholder ??
              "Search services..."
            }
            addButtonText={tableText.add ?? TEXT?.services?.add ?? "Add"}
            onAddClick={() => {
              if (createInitialGuard) {
                setCreateOpen(true);
              } else if (createInitialProperty) {
                setCreateOpen(true);
              } else if (createInitialGuardId != null) {
                setCreateInitialGuard({
                  id: createInitialGuardId,
                  label: createInitialGuardLabel ?? undefined,
                });
                setCreateOpen(true);
              } else if (createInitialPropertyId != null) {
                setCreateInitialProperty({
                  id: createInitialPropertyId,
                  label: createInitialPropertyLabel ?? undefined,
                });
                setCreateOpen(true);
              } else {
                setCreateOpen(true);
              }
            }}
            serverSide={serverSide}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onSearch={onSearch}
            searchFields={searchFields}
            sortField={sortField}
            sortOrder={sortOrder}
            toggleSort={toggleSort}
            actions={isActionsGrouped ? renderGroupedActions : renderActions}
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
        </div>
      </div>

      {createOpen && (
        <PropertyServiceEdit
          service={createEmptyService}
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateInitialGuard(null);
            setCreateInitialProperty(null);
          }}
          onUpdated={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe instanceof Promise) {
                await maybe;
              }
            }
            setCreateOpen(false);
            setCreateInitialGuard(null);
            setCreateInitialProperty(null);
          }}
          compact={compact}
        />
      )}

      {editService && context === "property" && (
        <PropertyServiceEdit
          service={editService}
          open={!!editService}
          onClose={() => setEditService(null)}
          onUpdated={onRefresh}
          compact={compact}
        />
      )}

      {editService && context === "guard" && (
        <GuardServiceEdit
          service={editService}
          open={!!editService}
          onClose={() => setEditService(null)}
          onUpdated={onRefresh}
          compact={compact}
        />
      )}

      {editService && context === "default" && (
        <EditServiceDialog
          service={editService}
          open={!!editService}
          onClose={() => setEditService(null)}
          onUpdated={onRefresh}
          compact={compact}
        />
      )}

      {deleteServiceState && (
        <DeleteServiceDialog
          service={deleteServiceState}
          onClose={() => setDeleteServiceState(null)}
          onDeleted={onRefresh}
          compact={compact}
        />
      )}

      {showService && (
        <ShowServiceDialog
          service={showService}
          open={!!showService}
          onClose={() => setShowService(null)}
          compact={compact}
        />
      )}

      {notesService && (
        <ServicesNotesModal
          service={notesService}
          open={!!notesService}
          onClose={() => setNotesService(null)}
          onUpdated={onRefresh}
        />
      )}

      {createNoteService && (
        <CreateNote
          open={!!createNoteService}
          onClose={() => setCreateNoteService(null)}
          onCreated={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe instanceof Promise) {
                await maybe;
              }
            }
            setCreateNoteService(null);
          }}
          initialGuardId={createNoteService.guard ?? null}
          initialPropertyId={createNoteService.assignedProperty ?? null}
        />
      )}
    </>
  );
}
