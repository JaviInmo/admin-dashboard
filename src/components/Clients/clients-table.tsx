// src/components/Clients/clients-table.tsx
"use client";

import { Pencil, Trash, Check, X, FileText, Plus, MoreHorizontal } from "lucide-react";
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
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import CreateClientDialog from "./Create/Create";
import DeleteClientDialog from "./Delete/Delete";
import EditClientDialog from "./Edit/Edit";
import ClientDetailsModal from "./ClientDetailsModal";
import type { Client as AppClient, Client } from "./types";
import { ClickableEmail } from "../ui/clickable-email";

/* Notas: modal y create */
import ClientsNotesModal from "./ClientsNotesModal";
import CreateNote from "@/components/Notes/Create/CreateNote";

export interface ClientsTableProps {
  clients: AppClient[];
  onSelectClient: (id: number) => void;
  onRefresh?: () => Promise<void>;

  // server-side pagination (opcional)
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

  // helper para acceder seguro a TEXT y permitir fallbacks + reemplazo de vars
  function getText(path: string, fallback?: string, vars?: Record<string, string>) {
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
  }

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editClient, setEditClient] = React.useState<AppClient | null>(null);
  const [deleteClient, setDeleteClient] = React.useState<AppClient | null>(null);

  // Estado para el modal de detalles del cliente
  const [detailsClient, setDetailsClient] = React.useState<(AppClient & { clientName: string }) | null>(null);

  // Notes: estado para ver y crear notas relacionadas al cliente
  const [notesClient, setNotesClient] = React.useState<AppClient | null>(null);
  const [createNoteClient, setCreateNoteClient] = React.useState<AppClient | null>(null);

  // Estado para controlar si las acciones están agrupadas - guardado en localStorage
  const [isActionsGrouped, setIsActionsGrouped] = React.useState(() => {
    try {
      const saved = localStorage.getItem('clients-table-actions-grouped');
      return saved ? JSON.parse(saved) : true; // Por defecto compacto (true)
    } catch {
      return true; // Por defecto compacto
    }
  });

  // Efecto para guardar en localStorage cuando cambie el estado
  React.useEffect(() => {
    try {
      localStorage.setItem('clients-table-actions-grouped', JSON.stringify(isActionsGrouped));
    } catch (error) {
      console.warn('No se pudo guardar la configuración en localStorage:', error);
    }
  }, [isActionsGrouped]);

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

  // status labels from i18n (fallbacks proporcionados)
  const statusActiveLabel = TEXT?.clients?.list?.statusActive ?? "Activo";
  const statusInactiveLabel = TEXT?.clients?.list?.statusInactive ?? "Inactivo";

  // helper to format templates like "Editar {name}"
  function formatTemplate(template?: string, client?: AppClient & { clientName?: string }) {
    if (!template) return "";
    const name =
      client?.clientName ?? client?.username ?? `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim() ?? "";
    return template.replace("{name}", name);
  }

  // Normaliza número para usar en enlace de wa.me (maneja +, 00, paréntesis, espacios, guiones)
  function normalizePhoneForWhatsapp(raw?: string | null): string {
    if (!raw) return "";
    let trimmed = String(raw).trim();
    // eliminar paréntesis, espacios, guiones, puntos
    let cleaned = trimmed.replace(/[\s().\-]/g, "");
    // si comienza con +, quitar el +
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.slice(1);
      return cleaned.replace(/^0+/, "");
    }
    // si comienza con 00, quitar los 00 (prefijo internacional)
    if (cleaned.startsWith("00")) {
      cleaned = cleaned.replace(/^00+/, "");
      return cleaned;
    }
    // else devolver sólo dígitos
    const digits = cleaned.replace(/\D+/g, "");
    return digits;
  }

  // Definir las columnas de la tabla - email (índice 1) será sacrificado
  const columns: Column<AppClient & { clientName: string }>[] = [
    {
      key: "clientName" as keyof (AppClient & { clientName: string }),
      label: TEXT.clients.list.headers.clientName,
      sortable: true,
      render: (client) => {
        const clientName = (client as any).clientName || "-";
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDetailsClient(client as AppClient & { clientName: string });
            }}
            className="text-left text-blue-600 hover:underline cursor-pointer text-sm"
            title="Ver detalles del cliente"
            aria-label="Ver detalles del cliente"
          >
            {clientName}
          </button>
        );
      },
      // espaciado compacto como Guards
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
    },
    {
      key: "email",
      label: TEXT.clients.list.headers.email, // Esta columna se sacrificará
      sortable: true,
      render: (client) => <ClickableEmail email={client.email || ""} />,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
    },
    {
      key: "phone",
      label: TEXT.clients.list.headers.phone,
      sortable: true,
      render: (client) => {
        const phone = client.phone ?? "";
        if (!phone) return "-";

        const normalized = normalizePhoneForWhatsapp(phone);
        const waUrl = normalized ? `https://wa.me/${encodeURIComponent(normalized)}` : `https://wa.me/${encodeURIComponent(phone)}`;

        const linkTitle = getText("clients.table.whatsappTitle", "Abrir en WhatsApp", { phone });
        const ariaLabel = getText("clients.table.whatsappAria", "Abrir chat de WhatsApp con {phone}", { phone });

        return (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              // Evitar que el clic en el link dispare la selección de fila
              e.stopPropagation();
            }}
            title={linkTitle}
            aria-label={ariaLabel}
            className="text-blue-600 hover:underline text-sm"
          >
            {phone}
          </a>
        );
      },
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
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
        return <span className="text-sm">{typeof balance === "number" ? `$${balance.toFixed(2)}` : String(balance)}</span>;
      },
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
    });
  }

  columns.push({
    key: "status" as keyof (AppClient & { clientName: string }),
    label: TEXT.clients.list.headers.status,
    sortable: false,
    // usa headerStyle para forzar ancho exacto de columna (evita que la estrategia inteligente la haga enorme)
    headerClassName: "text-center align-middle px-2 py-1 text-sm",
    headerStyle: { width: "120px", minWidth: "120px", maxWidth: "120px" },
    // celdas centradas
    cellClassName: "text-center align-middle px-2 py-1 text-sm",
    cellStyle: { width: "120px", minWidth: "120px", maxWidth: "120px" },
    render: (client) => {
      const status = (client as any).status ?? "active";
      const isActive = typeof status === "string" ? status.toLowerCase() === "active" : Boolean(status);
      return (
        <div>
          {isActive ? (
            <Check className="h-4 w-4 inline-block text-green-600" aria-label={statusActiveLabel} />
          ) : (
            <X className="h-4 w-4 inline-block text-red-500" aria-label={statusInactiveLabel} />
          )}
        </div>
      );
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

  // Acciones agrupadas (modo compacto - dropdown)
  const renderGroupedActions = (client: AppClient & { clientName: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setNotesClient(client);
        }}>
          <FileText className="h-4 w-4 mr-2" />
          {getText("clients.table.notesButton", "Notas")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setCreateNoteClient(client);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          {getText("clients.table.addNoteButton", "Agregar nota")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setEditClient(client);
        }}>
          <Pencil className="h-4 w-4 mr-2" />
          {getText("actions.edit", "Editar")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setDeleteClient(client);
        }}>
          <Trash className="h-4 w-4 mr-2" />
          {getText("actions.delete", "Eliminar")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Acciones de fila (ahora con aria-labels / títulos i18n) — envuelto para centrar y gap como en UsersTable
  const renderActions = (client: AppClient & { clientName: string }) => (
    isActionsGrouped ? renderGroupedActions(client) : (
      <div className="flex items-center gap-1">
        {/* Ver notas */}
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setNotesClient(client);
          }}
          title={getText("clients.table.notesButton", "Notas")}
          aria-label={getText("clients.table.notesAria", "Ver notas del cliente")}
        >
          <FileText className="h-4 w-4" />
        </Button>

        {/* Crear nota (rápido) */}
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setCreateNoteClient(client);
          }}
          title={getText("clients.table.addNoteButton", "Agregar nota")}
          aria-label={getText("clients.table.addNoteAria", "Agregar nota para el cliente")}
        >
          <Plus className="h-4 w-4" />
        </Button>

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
      </div>
    )
  );

  return (
    <>
      <ReusableTable
        className="text-sm" // más compacto como Guards
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
        actions={(client) => (
          // el wrapper que devuelve actions se centrará y tendrá gap 2 por el ReusableTable
          renderActions(client as AppClient & { clientName: string })
        )}
        actionsHeader={TEXT.clients.list.headers.actions ?? "Acciones"}
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

      {/* Client details modal */}
      {detailsClient && (
        <ClientDetailsModal
          client={detailsClient}
          open={!!detailsClient}
          onClose={() => setDetailsClient(null)}
        />
      )}

      {/* Clients Notes modal (ver / listar / crear desde ahí) */}
      {notesClient && (
        <ClientsNotesModal
          client={notesClient}
          open={!!notesClient}
          onClose={() => setNotesClient(null)}
          onUpdated={onRefresh}
        />
      )}

      {/* CreateNote quick dialog (abre el formulario de crear nota con initialUserId basado en el client) */}
      {createNoteClient && (
        <CreateNote
          open={!!createNoteClient}
          onClose={() => setCreateNoteClient(null)}
          onCreated={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe && typeof (maybe as unknown as Promise<unknown>)?.then === "function") {
                await maybe;
              }
            }
            setCreateNoteClient(null);
          }}
          // Si el client tiene campo `user` lo usamos (referencia al user), si no usamos client.id
          initialUserId={(createNoteClient.user ?? createNoteClient.id) as number}
        />
      )}
    </>
  );
}
