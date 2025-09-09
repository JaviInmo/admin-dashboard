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
}: ServicesTableProps) {
  const { TEXT } = useI18n();

  const [editService, setEditService] = React.useState<Service | null>(null);
  const [deleteServiceState, setDeleteServiceState] = React.useState<Service | null>(null);
  const [showService, setShowService] = React.useState<Service | null>(null);

  // Nuevo estado para abrir el modal de creación
  const [createOpen, setCreateOpen] = React.useState(false);

  const tableText = TEXT?.services?.table ?? {};

  const columns: Column<Service>[] = [
    {
      key: "name",
      label: tableText.headers?.name ?? "Name",
      sortable: true,
      render: (s) => <span className="font-medium">{s.name}</span>,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
      autoSize: true,
    },
    {
      key: "guardName",
      label: tableText.headers?.guard ?? "Guard",
      sortable: true,
      render: (s) => s.guardName ?? "-",
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
    },
    {
      key: "propertyName",
      label: tableText.headers?.property ?? "Property",
      sortable: true,
      render: (s) => s.propertyName ?? "-",
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
    },
    {
      key: "rate",
      label: tableText.headers?.rate ?? "Rate/hr",
      sortable: false,
      render: (s) => s.rate ?? "-",
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
      headerStyle: { width: "120px", minWidth: "90px" },
      cellStyle: { width: "120px", minWidth: "90px" },
    },
    {
      key: "monthlyBudget",
      label: tableText.headers?.monthlyBudget ?? "Monthly",
      sortable: false,
      render: (s) => s.monthlyBudget ?? "-",
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
      headerStyle: { width: "120px", minWidth: "90px" },
      cellStyle: { width: "120px", minWidth: "90px" },
    },
    {
      key: "recurrent",
      label: tableText.headers?.recurrent ?? "Recurrent",
      sortable: true,
      render: (s) => {
        if (s.recurrent === null || s.recurrent === undefined) return "-";
        const yes = tableText.recurrentYes ?? TEXT?.common?.yes ?? "Yes";
        const no = tableText.recurrentNo ?? TEXT?.common?.no ?? "No";
        return s.recurrent ? yes : no;
      },
      headerClassName: "px-2 py-1 text-sm text-center",
      cellClassName: "px-2 py-1 text-sm text-center",
      headerStyle: { width: "100px", minWidth: "80px" },
      cellStyle: { width: "100px", minWidth: "80px" },
    },
    {
      key: "isActive",
      label: tableText.headers?.isActive ?? "Active",
      sortable: true,
      render: (s) => {
        // mostrar "-" cuando es null/undefined, usar labels traducidos si existen
        if (s.isActive === null || s.isActive === undefined) return "-";
        const yes = tableText.activeLabel ?? TEXT?.common?.yes ?? "Yes";
        const no = tableText.inactiveLabel ?? TEXT?.common?.no ?? "No";
        return s.isActive ? yes : no;
      },
      headerClassName: "px-2 py-1 text-sm text-center",
      cellClassName: "px-2 py-1 text-sm text-center",
      headerStyle: { width: "90px", minWidth: "70px" },
      cellStyle: { width: "90px", minWidth: "70px" },
    },
  ];

  const searchFields: (keyof Service)[] = ["name", "guardName", "propertyName"];

  const renderActions = (s: Service) => (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setShowService(s);
        }}
        title={TEXT?.actions?.show ?? "Show"}
        aria-label={TEXT?.actions?.show ?? "Show"}
      >
        <Eye className="h-4 w-4" />
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
        <Pencil className="h-4 w-4" />
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
        <Trash className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );

  return (
    <>
      <ReusableTable
        className="text-sm"
        data={services}
        columns={columns}
        getItemId={(s) => s.id}
        onSelectItem={(id) => {
          const found = services.find((x) => x.id === Number(id));
          if (found) setShowService(found);
        }}
        title={tableText.title ?? TEXT?.services?.title ?? "Services"}
        searchPlaceholder={tableText.searchPlaceholder ?? TEXT?.services?.searchPlaceholder ?? "Search services..."}
        addButtonText={tableText.add ?? TEXT?.services?.add ?? "Add"}
        onAddClick={() => setCreateOpen(true)}
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

      {createOpen && (
        <CreateServiceDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe && typeof (maybe as any).then === "function") {
                await maybe;
              }
            }
            setCreateOpen(false);
          }}
        />
      )}

      {editService && (
        <EditServiceDialog
          service={editService}
          open={!!editService}
          onClose={() => setEditService(null)}
          onUpdated={onRefresh}
        />
      )}

      {deleteServiceState && (
        <DeleteServiceDialog
          service={deleteServiceState}
          onClose={() => setDeleteServiceState(null)}
          onDeleted={onRefresh}
        />
      )}

      {showService && (
        <ShowServiceDialog
          service={showService}
          open={!!showService}
          onClose={() => setShowService(null)}
        />
      )}
    </>
  );
}
