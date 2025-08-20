"use client";

import { Pencil, Trash } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import CreateGuardDialog from "./Create/Create";
import DeleteGuardDialog from "./Delete/Delete";
import EditGuardDialog from "./Edit/Edit";
import type { Guard } from "./types";
import { ClickableEmail } from "../ui/clickable-email";

export interface GuardsTableProps {
  guards: Guard[];
  onSelectGuard: (id: number) => void;
  onRefresh?: () => Promise<void>;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onSearch?: (term: string) => void;
  onPageSizeChange?: (size: number) => void;

  sortField: keyof Guard;
  sortOrder: SortOrder;
  toggleSort: (key: keyof Guard) => void;
}

export default function GuardsTable({
  guards,
  onSelectGuard,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onSearch,
  onPageSizeChange,
  sortField,
  sortOrder,
  toggleSort,
}: GuardsTableProps) {
  const { TEXT } = useI18n();
  
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editGuard, setEditGuard] = React.useState<Guard | null>(null);
  const [deleteGuard, setDeleteGuard] = React.useState<Guard | null>(null);

  // Access i18n keys
  const guardTable = (TEXT.guards && (TEXT.guards as any).table) ?? (TEXT.guards as any) ?? {};

  // Definir las columnas de la tabla - correo (índice 2) será sacrificado
  const columns: Column<Guard>[] = [
    {
      key: "firstName",
      label: guardTable.headers?.name ?? "Nombre",
      sortable: true,
      render: (guard) => guard.firstName ?? "",
    },
    {
      key: "lastName", 
      label: guardTable.headers?.lastName ?? "Apellido",
      sortable: true,
      render: (guard) => guard.lastName ?? "",
    },
    {
      key: "email",
      label: guardTable.headers?.email ?? "Correo", // Esta columna se sacrificará
      sortable: true,
      render: (guard) => <ClickableEmail email={guard.email || ""} />,
    },
    {
      key: "phone",
      label: guardTable.headers?.phone ?? "Teléfono",
      sortable: false,
      render: (guard) => guard.phone ?? "-",
    },
    {
      key: "ssn",
      label: guardTable.headers?.ssn ?? "DNI/SSN",
      sortable: false,
      render: () => guardTable.ssnHidden ?? "******",
    },
    {
      key: "birthdate",
      label: guardTable.headers?.birthdate ?? "Fecha Nac.",
      sortable: false,
      render: (guard) => guard.birthdate ?? "-",
    },
  ];

  // Campos de búsqueda
  const searchFields: (keyof Guard)[] = ["firstName", "lastName", "email", "phone"];

  // Acciones de fila
  const renderActions = (guard: Guard) => (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setEditGuard(guard);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteGuard(guard);
        }}
      >
        <Trash className="h-4 w-4 text-red-500" />
      </Button>
    </>
  );

  return (
    <>
      <ReusableTable
        data={guards}
        columns={columns}
        getItemId={(guard) => guard.id}
        onSelectItem={(id) => onSelectGuard(Number(id))}
        title={guardTable.title ?? "Guards List"}
        searchPlaceholder={guardTable.searchPlaceholder ?? "Buscar guardias..."}
        addButtonText={guardTable.addButton ?? "Agregar"}
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
      />

      <CreateGuardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onRefresh}
      />
      {editGuard && (
        <EditGuardDialog
          guard={editGuard}
          open={!!editGuard}
          onClose={() => setEditGuard(null)}
          onUpdated={onRefresh}
        />
      )}
      {deleteGuard && (
        <DeleteGuardDialog
          guard={deleteGuard}
          onClose={() => setDeleteGuard(null)}
          onDeleted={onRefresh}
        />
      )}
    </>
  );
}
