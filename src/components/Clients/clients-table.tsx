"use client";

import { Pencil, Trash } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import CreateClientDialog from "./Create/Create";
import DeleteClientDialog from "./Delete/Delete";
import EditClientDialog from "./Edit/Edit";
import type { Client as AppClient, Client } from "./types";
import { ClickableEmail } from "../ui/clickable-email";

export interface ClientsTableProps {
  clients: AppClient[];
  onSelectClient: (id: number) => void;
  onRefresh?: () => Promise<void>;

  // server-side pagination (optional)
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onSearch?: (term: string) => void;
  isPageLoading?: boolean;

  sortField: keyof Client;
  sortOrder: SortOrder;
  toggleSort: (key: keyof Client) => void;

  // ocultar columna balance (por defecto: oculto)
  hideBalance?: boolean;
  onPageSizeChange?: (size: number) => void;
}

export default function ClientsTable({
  clients,
  onSelectClient,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onSearch,
  isPageLoading = false,
  hideBalance = true,
  onPageSizeChange,
  sortField,
  sortOrder,
  toggleSort,
}: ClientsTableProps) {
  const { TEXT } = useI18n();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editClient, setEditClient] = React.useState<AppClient | null>(null);
  const [deleteClient, setDeleteClient] = React.useState<AppClient | null>(null);

  // Normalizar datos del cliente
  const normalizedClients = clients.map((c) => {
    const firstName = c.firstName ?? (c as any).first_name ?? "";
    const lastName = c.lastName ?? (c as any).last_name ?? "";
    const clientName = firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : (c.username ?? (c as any).name ?? "");
    return {
      ...c,
      firstName,
      lastName,
      clientName,
    } as AppClient & { clientName: string };
  });

  // status labels from i18n (fallbacks provided)
  const statusActiveLabel = TEXT?.clients?.list?.statusActive ?? "Activo";
  const statusInactiveLabel = TEXT?.clients?.list?.statusInactive ?? "Inactivo";

  // helper to format templates like "Editar {name}"
  function formatTemplate(template?: string, client?: AppClient & { clientName?: string }) {
    if (!template) return "";
    const name =
      client?.clientName ?? client?.username ?? `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim() ?? "";
    return template.replace("{name}", name);
  }

  // Definir las columnas de la tabla - email (índice 1) será sacrificado
  const columns: Column<AppClient & { clientName: string }>[] = [
    {
      key: "clientName" as keyof (AppClient & { clientName: string }),
      label: TEXT.clients.list.headers.clientName,
      sortable: true,
      render: (client) => (client as any).clientName || "-",
    },
    {
      key: "email",
      label: TEXT.clients.list.headers.email, // Esta columna se sacrificará
      sortable: true,
      render: (client) => <ClickableEmail email={client.email || ""} />,
    },
    {
      key: "phone",
      label: TEXT.clients.list.headers.phone,
      sortable: true,
      render: (client) => client.phone ?? "-",
    },
  ];

  // Agregar columna de balance solo si no está oculta
  if (!hideBalance) {
    columns.push({
      key: "balance" as keyof (AppClient & { clientName: string }),
      label: TEXT.clients.list.headers.balance,
      sortable: true,
      render: (client) => {
        const balance = (client as any).balance ?? 0;
        return typeof balance === "number" ? `$${balance.toFixed(2)}` : String(balance);
      },
    });
  }

  // Agregar columna de status (usa labels i18n)
  columns.push({
    key: "status" as keyof (AppClient & { clientName: string }),
    label: TEXT.clients.list.headers.status,
    sortable: false,
    render: (client) => {
      const status = (client as any).status ?? "active";
      if (typeof status === "string") {
        return status.toLowerCase() === "active" ? statusActiveLabel : statusInactiveLabel;
      }
      return String(status);
    },
  });

  // Campos de búsqueda
  const searchFields: (keyof (AppClient & { clientName: string }))[] = [
    "clientName" as keyof (AppClient & { clientName: string }),
    "firstName",
    "lastName",
    "email",
    "phone",
  ];

  // Acciones de fila (ahora con aria-labels / títulos i18n)
  const renderActions = (client: AppClient & { clientName: string }) => (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setEditClient(client);
        }}
        aria-label={formatTemplate(TEXT.clients.table.actionEdit, client)}
        title={formatTemplate(TEXT.clients.table.actionEdit, client)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteClient(client);
        }}
        aria-label={formatTemplate(TEXT.clients.table.actionDelete, client)}
        title={formatTemplate(TEXT.clients.table.actionDelete, client)}
      >
        <Trash className="h-4 w-4 text-red-500" />
      </Button>
    </>
  );

  return (
    <>
      <ReusableTable
        data={normalizedClients}
        columns={columns}
        getItemId={(client) => client.id}
        onSelectItem={(id) => onSelectClient(Number(id))}
        title={TEXT.clients.list.title}
        searchPlaceholder={TEXT.clients.list.searchPlaceholder ?? "Buscar clientes..."}
        addButtonText={TEXT.clients.list.addClient ?? "Agregar"}
        onAddClick={() => setCreateOpen(true)}
        serverSide={serverSide}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onSearch={onSearch}
        searchFields={searchFields}
        sortField={sortField as keyof (AppClient & { clientName: string })}
        sortOrder={sortOrder}
        toggleSort={toggleSort as (key: keyof (AppClient & { clientName: string })) => void}
        actions={renderActions}
        isPageLoading={isPageLoading}
      />

      <CreateClientDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editClient && (
        <EditClientDialog
          client={editClient}
          open={!!editClient}
          onClose={() => setEditClient(null)}
          onUpdated={onRefresh}
        />
      )}
      {deleteClient && (
        <DeleteClientDialog
          client={deleteClient}
          open={!!deleteClient}
          onClose={() => setDeleteClient(null)}
          onDeleted={onRefresh}
        />
      )}
    </>
  );
}
