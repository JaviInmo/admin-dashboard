// src/components/Users/UsersTable.tsx
"use client";

import { Pencil, Trash, Eye, Check, X, FileText, Plus, MoreHorizontal } from "lucide-react";
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
import type { User, Permissions } from "./types";
import CreateUserDialog from "./Create/Create";
import EditUserDialog from "./Edit/Edit";
import DeleteUserDialog from "./Delete/Delete";
import ShowUserDialog from "./Show/Show";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";

/* Notas: modal y create */
import UsersNotesModal from "./UsersNotesModal";
import CreateNote from "@/components/Notes/Create/CreateNote";

export interface UsersTableProps {
  users: (User & { permissions?: Permissions })[];
  onSelectUser?: (id: number) => void;
  onRefresh?: () => Promise<void>;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onSearch?: (term: string) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sortField: keyof User;
  sortOrder: SortOrder;
  toggleSort: (field: keyof User) => void;
  isPageLoading?: boolean;
}

export default function UsersTable({
  users,
  onSelectUser,
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
  isPageLoading = false,
}: UsersTableProps) {
  const { TEXT, lang } = useI18n();

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
  const [editUser, setEditUser] = React.useState<(User & { permissions?: Permissions }) | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);
  const [showUser, setShowUser] = React.useState<(User & { permissions?: Permissions }) | null>(null);

  // Notes: state para ver y crear nota desde user
  const [notesUser, setNotesUser] = React.useState<User | null>(null);
  const [createNoteUser, setCreateNoteUser] = React.useState<User | null>(null);

  // Estado para controlar si las acciones están agrupadas - guardado en localStorage
  const [isActionsGrouped, setIsActionsGrouped] = React.useState(() => {
    try {
      const saved = localStorage.getItem('users-table-actions-grouped');
      return saved ? JSON.parse(saved) : true; // Por defecto compacto (true)
    } catch {
      return true; // Por defecto compacto
    }
  });

  // Efecto para guardar en localStorage cuando cambie el estado
  React.useEffect(() => {
    try {
      localStorage.setItem('users-table-actions-grouped', JSON.stringify(isActionsGrouped));
    } catch (error) {
      console.warn('No se pudo guardar la configuración en localStorage:', error);
    }
  }, [isActionsGrouped]);

  // Normalizar datos de usuarios
  const normalizedUsers = users.map((u) => ({
    ...u,
    firstName: u.firstName ?? (u.name ? u.name.split(" ").slice(0, -1).join(" ") || u.name : ""),
    lastName: u.lastName ?? (u.name ? u.name.split(" ").slice(-1).join("") : ""),
  }));

  const renderRoleText = (u: User) => {
    if ((u as any).is_superuser || u.isSuperuser) return getText("users.userTypes.superuser", lang === "es" ? "Superusuario" : "Superuser");
    if ((u as any).is_staff || u.isStaff) return getText("users.userTypes.staff", lang === "es" ? "Staff" : "Staff");
    return getText("users.userTypes.user", lang === "es" ? "Usuario" : "User");
  };

  // Definir las columnas de la tabla
  const columns: Column<User & { permissions?: Permissions }>[] = [
    {
      key: "username",
      label: TEXT.users?.table?.headers?.username ?? getText("users.table.headers.username", lang === "es" ? "Usuario" : "Username"),
      sortable: true,
      render: (user) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectUser?.(user.id);
          }}
          className="text-blue-600 hover:underline"
        >
          {user.username}
        </button>
      ),
      cellClassName: "px-3 py-2",
    },
    {
      key: "firstName",
      label: TEXT.users?.table?.headers?.firstName ?? getText("users.table.headers.firstName", lang === "es" ? "Nombre" : "First Name"),
      sortable: true,
      render: (user) => user.firstName || "-",
      cellClassName: "px-3 py-2",
    },
    {
      key: "lastName",
      label: TEXT.users?.table?.headers?.lastName ?? getText("users.table.headers.lastName", lang === "es" ? "Apellido" : "Last Name"),
      sortable: true,
      render: (user) => user.lastName || "-",
      cellClassName: "px-3 py-2",
    },
    {
      key: "email",
      label: TEXT.users?.table?.headers?.email ?? getText("users.table.headers.email", lang === "es" ? "Correo" : "Email"),
      sortable: true,
      render: (user) => user.email ?? "-",
      cellClassName: "px-3 py-2",
    },
    {
      key: "isActive" as keyof (User & { permissions?: Permissions }),
      label: getText("users.table.headers.status", lang === "es" ? "Estado" : "Status"),
      sortable: false,
      headerClassName: "text-center align-middle",
      headerStyle: { width: "120px", minWidth: "120px", maxWidth: "120px" },
      cellClassName: "text-center align-middle",
      cellStyle: { width: "120px", minWidth: "120px", maxWidth: "120px" },
      render: (user) => {
        const isActive = (user as any).is_active ?? user.isActive ?? true;
        return (
          <div>
            {isActive ? (
              <Check className="h-4 w-4 inline-block text-green-600" aria-label={getText("users.status.active", lang === "es" ? "Activo" : "Active")} />
            ) : (
              <X className="h-4 w-4 inline-block text-red-500" aria-label={getText("users.status.inactive", lang === "es" ? "Inactivo" : "Inactive")} />
            )}
          </div>
        );
      },
    },
    {
      key: "isSuperuser" as keyof (User & { permissions?: Permissions }),
      label: getText("users.table.headers.role", lang === "es" ? "Rol" : "Role"),
      sortable: false,
      headerClassName: "text-center align-middle",
      headerStyle: { width: "120px", minWidth: "120px", maxWidth: "120px" },
      cellClassName: "text-center align-middle",
      cellStyle: { width: "120px", minWidth: "120px", maxWidth: "120px" },
      render: (user) => renderRoleText(user),
    },
  ];

  // Campos de búsqueda
  const searchFields: (keyof (User & { permissions?: Permissions }))[] = [
    "username",
    "firstName",
    "lastName",
    "email",
    "name" as keyof (User & { permissions?: Permissions }),
  ];

  // Acciones agrupadas (modo compacto - dropdown)
  const renderGroupedActions = (user: User & { permissions?: Permissions }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setShowUser(user);
        }}>
          <Eye className="h-4 w-4 mr-2" />
          {getText("actions.view", "Ver")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setNotesUser(user);
        }}>
          <FileText className="h-4 w-4 mr-2" />
          Notas
        </DropdownMenuItem>

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setCreateNoteUser(user);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar nota
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setEditUser(user);
        }}>
          <Pencil className="h-4 w-4 mr-2" />
          {getText("actions.edit", "Editar")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setDeleteUser(user);
        }}>
          <Trash className="h-4 w-4 mr-2" />
          {getText("actions.delete", "Eliminar")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Acciones de fila (ahora con botones para Notas: ver y crear)
  const renderActions = (user: User & { permissions?: Permissions }) => (
    isActionsGrouped ? renderGroupedActions(user) : (
      <>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setShowUser(user);
          }}
          title={getText("actions.view", "Ver")}
          aria-label={getText("actions.view", "Ver")}
        >
          <Eye className="h-4 w-4 text-blue-500" />
        </Button>

        {/* Ver notas */}
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setNotesUser(user);
          }}
          title="Notas"
          aria-label="Notas"
        >
          <FileText className="h-4 w-4" />
        </Button>

        {/* Crear nota (rápido) */}
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setCreateNoteUser(user);
          }}
          title="Agregar nota"
          aria-label="Agregar nota"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setEditUser(user);
          }}
          title={getText("actions.edit", "Editar")}
          aria-label={getText("actions.edit", "Editar")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteUser(user);
          }}
          title={getText("actions.delete", "Eliminar")}
          aria-label={getText("actions.delete", "Eliminar")}
        >
          <Trash className="h-4 w-4 text-red-500" />
        </Button>
      </>
    )
  );

  return (
    <>
      <ReusableTable
        data={normalizedUsers}
        columns={columns}
        getItemId={(user) => user.id}
        onSelectItem={(id) => onSelectUser?.(Number(id))}
        title={TEXT.users?.table?.title ?? getText("users.table.title", lang === "es" ? "Lista de Usuarios" : "Users List")}
        searchPlaceholder={TEXT.users?.table?.searchPlaceholder ?? getText("users.table.searchPlaceholder", lang === "es" ? "Buscar..." : "Search...")}
        addButtonText={TEXT.users?.table?.add ?? getText("users.table.add", lang === "es" ? "Agregar" : "Add")}
        onAddClick={() => setCreateOpen(true)}
        serverSide={serverSide}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onSearch={onSearch}
        searchFields={searchFields}
        sortField={sortField as keyof (User & { permissions?: Permissions })}
        sortOrder={sortOrder}
        toggleSort={toggleSort as (key: keyof (User & { permissions?: Permissions })) => void}
        actions={renderActions}
        actionsHeader={TEXT.users?.table?.headers?.actions ?? getText("users.table.headers.actions", lang === "es" ? "Acciones" : "Actions")}
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

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editUser && <EditUserDialog user={editUser} open={!!editUser} onClose={() => setEditUser(null)} onUpdated={onRefresh} />}
      {deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={onRefresh} />}
      {showUser && <ShowUserDialog user={showUser} open={!!showUser} onClose={() => setShowUser(null)} />}

      {/* Users Notes modal (ver / listar / crear desde ahí) */}
      {notesUser && (
        <UsersNotesModal
          user={notesUser}
          open={!!notesUser}
          onClose={() => setNotesUser(null)}
          onUpdated={onRefresh}
        />
      )}

      {/* Create Note quick dialog (abre el formulario de crear nota con initialUserId) */}
      {createNoteUser && (
        <CreateNote
          open={!!createNoteUser}
          onClose={() => setCreateNoteUser(null)}
          onCreated={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe && typeof (maybe as unknown as Promise<unknown>)?.then === "function") {
                await maybe;
              }
            }
            setCreateNoteUser(null);
          }}
          initialUserId={createNoteUser.id}
        />
      )}
    </>
  );
}
