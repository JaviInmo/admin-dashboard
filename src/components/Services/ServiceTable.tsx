// src/components/Services/ServiceTable.tsx
"use client";

import { Pencil, Trash, Eye } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import type { Service } from "./types";
import DeleteServiceDialog from "./Delete/Delete";
import EditServiceDialog from "./Edit/Edit";
import PropertyServiceEdit from "../Properties/PropertyServiceEdit";
import GuardServiceEdit from "../Guards/GuardServiceEdit";
import ShowServiceDialog from "./Show/Show";
import CreateServiceDialog from "./Create/Create";

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

  // Nuevos props: si se pasan, cuando se abra el Create dialog, se prellenará el guard o la property.
  createInitialGuardId?: number | null;
  createInitialGuardLabel?: string | null;

  createInitialPropertyId?: number | null;
  createInitialPropertyLabel?: string | null;

  // compact mode (cuando se renderiza dentro del modal de guardias pequeño)
  compact?: boolean;

  // largeMode -> cuando queremos que el table sea más grande (textos, paddings y anchos).
  largeMode?: boolean;

  // shrinkToFit -> fuerza la tabla a "encoger" (table-fixed, truncate, anchos reducidos)
  // útil para que quepa en dialogos más estrechos sin overflow X.
  shrinkToFit?: boolean;

  // context -> para determinar qué modal de edición usar
  context?: "property" | "guard" | "default";

  // columnsConfig -> para controlar qué columnas mostrar según el contexto
  columnsConfig?: {
    showName?: boolean;
    showGuard?: boolean;
    showProperty?: boolean;
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
  columnsConfig = { showName: true, showGuard: true, showProperty: true },
}: ServicesTableProps) {
  const { TEXT } = useI18n();

 /*  function getText(
    path: string,
    fallback?: string,
    vars?: Record<string, string>
  ) {
    const parts = path.split(".");
    let val: any = TEXT;
    for (const p of parts) {
      val = val?.[p];
      if (val == null) break;
    }
    let str = typeof val === "string" ? val : fallback ?? path;
    if (vars && typeof str === "string") {
      for (const k of Object.keys(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
      }
    }
    return String(str);
  } */

  const [editService, setEditService] = React.useState<Service | null>(null);
  const [deleteServiceState, setDeleteServiceState] =
    React.useState<Service | null>(null);
  const [showService, setShowService] = React.useState<Service | null>(null);

  // Nuevo estado para abrir el modal de creación
  const [createOpen, setCreateOpen] = React.useState(false);

  // Estado para prefijar guard cuando abrimos CreateServiceDialog desde un guard
  const [createInitialGuard, setCreateInitialGuard] = React.useState<{
    id?: number | null;
    label?: string | null;
  } | null>(null);

  // Estado para prefijar property cuando abrimos CreateServiceDialog desde una property
  const [createInitialProperty, setCreateInitialProperty] = React.useState<{
    id?: number | null;
    label?: string | null;
  } | null>(null);

  const tableText = TEXT?.services?.table ?? {};

  // Visual adjustments:
  const sizeHeaderCell = compact
    ? "px-2 py-1 text-xs"
    : shrinkToFit
    ? "px-2 py-1 text-sm"
    : largeMode
    ? "px-4 py-2 text-base"
    : "px-3 py-2 text-sm";

  const headerCellSmallStyle = compact
    ? { width: "80px", minWidth: "60px" }
    : shrinkToFit
    ? { width: "90px", minWidth: "70px" }
    : largeMode
    ? { width: "160px", minWidth: "140px" }
    : { width: "120px", minWidth: "100px" };

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
    // Columna Name - se muestra según configuración
    ...(columnsConfig.showName ? [{
      key: "name" as keyof Service,
      label: tableText.headers?.name ?? "Name",
      sortable: true,
      render: (s: Service) => (
        <Trunc title={s.name}>
          <span className="font-medium">{s.name}</span>
        </Trunc>
      ),
      headerClassName: sizeHeaderCell,
      cellClassName: `${sizeHeaderCell} max-w-[220px]`,
      autoSize: true,
    }] : []),
    
    // Columna Guard - se muestra según configuración
    ...(columnsConfig.showGuard ? [{
      key: "guardName" as keyof Service,
      label: tableText.headers?.guard ?? "Guard",
      sortable: true,
      render: (s: Service) => <Trunc title={s.guardName}>{s.guardName ?? "-"}</Trunc>,
      headerClassName: sizeHeaderCell,
      cellClassName: sizeHeaderCell,
    }] : []),
    
    // Columna Property - se muestra según configuración
    ...(columnsConfig.showProperty ? [{
      key: "propertyName" as keyof Service,
      label: tableText.headers?.property ?? "Property",
      sortable: true,
      render: (s: Service) => (
        <Trunc title={s.propertyName}>{s.propertyName ?? "-"}</Trunc>
      ),
      headerClassName: sizeHeaderCell,
      cellClassName: sizeHeaderCell,
    }] : []),
    {
      key: "totalHours",
      label: tableText.headers?.totalHours ?? "Cant. Hrs",
      sortable: false,
      render: (s) => (
        <Trunc title={String(s.totalHours ?? null)}>{s.totalHours ?? "-"}</Trunc>
      ),
      headerClassName: sizeHeaderCell,
      cellClassName: sizeHeaderCell,
      headerStyle: headerCellSmallStyle,
      cellStyle: headerCellSmallStyle,
    },
    {
      key: "rate",
      label: tableText.headers?.rate ?? "Rate/hr",
      sortable: false,
      render: (s) => (
        <Trunc title={String(s.rate ?? null)}>{s.rate ?? "-"}</Trunc>
      ),
      headerClassName: sizeHeaderCell,
      cellClassName: sizeHeaderCell,
      headerStyle: headerCellSmallStyle,
      cellStyle: headerCellSmallStyle,
    },
    {
      key: "monthlyBudget",
      label: tableText.headers?.monthlyBudget ?? "Monthly",
      sortable: false,
      render: (s) => (
        <Trunc title={String(s.monthlyBudget ?? null)}>
          {s.monthlyBudget ?? "-"}
        </Trunc>
      ),
      headerClassName: sizeHeaderCell,
      cellClassName: sizeHeaderCell,
      headerStyle: headerCellSmallStyle,
      cellStyle: headerCellSmallStyle,
    },
    {
      key: "recurrent",
      label: tableText.headers?.recurrent ?? "Recurrent",
      sortable: true,
      render: (s) => {
        if (s.recurrent === null || s.recurrent === undefined) return "-";
        const yes = tableText.recurrentYes ?? TEXT?.common?.yes ?? "Yes";
        const no = tableText.recurrentNo ?? TEXT?.common?.no ?? "No";
        return (
          <Trunc title={s.recurrent ? yes : no}>{s.recurrent ? yes : no}</Trunc>
        );
      },
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: shrinkToFit
        ? { width: "100px", minWidth: "80px" }
        : largeMode
        ? { width: "140px", minWidth: "120px" }
        : { width: "100px", minWidth: "80px" },
      cellStyle: shrinkToFit
        ? { width: "100px", minWidth: "80px" }
        : largeMode
        ? { width: "140px", minWidth: "120px" }
        : { width: "100px", minWidth: "80px" },
    },
    {
      key: "isActive",
      label: tableText.headers?.isActive ?? "Active",
      sortable: true,
      render: (s) => {
        if (s.isActive === null || s.isActive === undefined) return "-";
        const yes = tableText.activeLabel ?? TEXT?.common?.yes ?? "Yes";
        const no = tableText.inactiveLabel ?? TEXT?.common?.no ?? "No";
        return (
          <Trunc title={s.isActive ? yes : no}>{s.isActive ? yes : no}</Trunc>
        );
      },
      headerClassName: `${sizeHeaderCell} text-center`,
      cellClassName: `${sizeHeaderCell} text-center`,
      headerStyle: shrinkToFit
        ? { width: "100px", minWidth: "80px" }
        : largeMode
        ? { width: "140px", minWidth: "120px" }
        : { width: "90px", minWidth: "70px" },
      cellStyle: shrinkToFit
        ? { width: "100px", minWidth: "80px" }
        : largeMode
        ? { width: "140px", minWidth: "120px" }
        : { width: "90px", minWidth: "70px" },
    },
  ];

  const searchFields: (keyof Service)[] = [
    ...(columnsConfig.showName ? ["name" as keyof Service] : []),
    ...(columnsConfig.showGuard ? ["guardName" as keyof Service] : []),
    ...(columnsConfig.showProperty ? ["propertyName" as keyof Service] : []),
  ];

  const renderActions = (s: Service) => {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setShowService(s);
          }}
          title={TEXT?.actions?.view ?? "View"}
          aria-label={TEXT?.actions?.view ?? "View"}
        >
          <Eye className={iconSizeClass} />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setEditService(s);
          }}
          title={TEXT?.actions?.edit ?? "Edit"}
          aria-label={TEXT?.actions?.edit ?? "Edit"}
        >
          <Pencil className={iconSizeClass} />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteServiceState(s);
          }}
          title={TEXT?.actions?.delete ?? "Delete"}
          aria-label={TEXT?.actions?.delete ?? "Delete"}
        >
          <Trash className={`${iconSizeClass} text-red-500`} />
        </Button>
      </div>
    );
  };

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
              // Prioritize any explicit createInitialX set in component state
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
            actions={renderActions}
            isPageLoading={isPageLoading}
          />
        </div>
      </div>

      {createOpen && (
        <CreateServiceDialog
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            setCreateInitialGuard(null);
            setCreateInitialProperty(null);
          }}
          onCreated={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe && typeof (maybe as any).then === "function") {
                await maybe;
              }
            }
            setCreateOpen(false);
            setCreateInitialGuard(null);
            setCreateInitialProperty(null);
          }}
          initialGuardId={
            createInitialGuard?.id ?? createInitialGuardId ?? undefined
          }
          initialGuardLabel={
            createInitialGuard?.label ?? createInitialGuardLabel ?? undefined
          }
          initialPropertyId={
            createInitialProperty?.id ?? createInitialPropertyId ?? undefined
          }
          initialPropertyLabel={
            createInitialProperty?.label ??
            createInitialPropertyLabel ??
            undefined
          }
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
    </>
  );
}
