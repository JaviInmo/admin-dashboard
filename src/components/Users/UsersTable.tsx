"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash, Eye, Check, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReusablePagination } from "@/components/ui/reusable-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { User, Permissions } from "./types";
import CreateUserDialog from "./Create/Create";
import EditUserDialog from "./Edit/Edit";
import DeleteUserDialog from "./Delete/Delete";
import ShowUserDialog from "./Show/Show";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";

export interface UsersTableProps {
  users: (User & { permissions?: Permissions })[];
  onSelectUser: (id: number) => void;
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

  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<(User & { permissions?: Permissions }) | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<User | null>(null);
  const [showUser, setShowUser] = React.useState<(User & { permissions?: Permissions }) | null>(null);

  const itemsPerPage = pageSize ?? 5;

  // estilos y animación del search
  const [highlightSearch, setHighlightSearch] = React.useState(true);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (searchRef.current) {
      try {
        searchRef.current.focus();
      } catch {}
    }
    const t = setTimeout(() => setHighlightSearch(false), 3500);
    return () => clearTimeout(t);
  }, []);

  const normalizedUsers = users.map(
    (u) =>
      ({
        ...u,
        firstName:
          u.firstName ??
          (u.name ? u.name.split(" ").slice(0, -1).join(" ") || u.name : ""),
        lastName: u.lastName ?? (u.name ? u.name.split(" ").slice(-1).join("") : ""),
      } as User)
  );

  const effectiveList = serverSide
    ? normalizedUsers
    : normalizedUsers.filter((u) => {
        const q = search.toLowerCase();
        return (
          (u.username ?? "").toLowerCase().includes(q) ||
          (u.firstName ?? "").toLowerCase().includes(q) ||
          (u.lastName ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.name ?? "").toLowerCase().includes(q)
        );
      });

  const localTotalPages = Math.max(1, Math.ceil(effectiveList.length / itemsPerPage));
  const effectiveTotalPages = serverSide ? Math.max(1, totalPages ?? 1) : localTotalPages;
  const effectivePage = serverSide
    ? Math.max(1, Math.min(currentPage, effectiveTotalPages))
    : page;
  const startIndex = (effectivePage - 1) * itemsPerPage;
  const paginatedUsers = serverSide
    ? effectiveList
    : effectiveList.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    if (!serverSide) setPage(1);
  }, [users.length, search, serverSide, itemsPerPage]);

  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!serverSide) return;
    if (!onSearch) return;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    searchTimerRef.current = setTimeout(() => {
      onSearch(search);
    }, 350);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [search, serverSide, onSearch]);

  const goToPage = (p: number) => {
    const newP = Math.max(1, Math.min(effectiveTotalPages, p));
    if (serverSide) onPageChange?.(newP);
    else setPage(newP);
  };

  const renderSortIcon = (field: keyof User) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const renderRoleText = (u: User) => {
    // localized role names using users.userTypes.* keys, fallbacks differ by lang
    if ((u as any).is_superuser || u.isSuperuser) return getText("users.userTypes.superuser", lang === "es" ? "Superusuario" : "Superuser");
    if ((u as any).is_staff || u.isStaff) return getText("users.userTypes.staff", lang === "es" ? "Staff" : "Staff");
    return getText("users.userTypes.user", lang === "es" ? "Usuario" : "User");
  };

  const perPageLabel = (TEXT.users as any)?.table?.perPage ?? (lang === "es" ? "por página" : "per page");

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      {/* Header con search y acciones */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <h3 className="text-lg font-semibold md:mr-4">
          {TEXT.users?.table?.title ?? getText("users.table.title", lang === "es" ? "Lista de Usuarios" : "Users List")}
        </h3>

        <div className="flex-1 md:mx-4 w-full max-w-3xl">
          <div
            className={`${highlightSearch ? "search-highlight search-pulse" : ""}`}
            style={{ minWidth: 280 }}
          >
            <Input
              ref={searchRef}
              placeholder={TEXT.users?.table?.searchPlaceholder ?? getText("users.table.searchPlaceholder", lang === "es" ? "Buscar..." : "Search...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
              aria-label={TEXT.users?.table?.searchPlaceholder ?? getText("users.table.searchPlaceholder", lang === "es" ? "Buscar usuarios" : "Search users")}
            />
          </div>
        </div>

        {/* Selector de Page Size */}
        <div className="flex-none">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-32 justify-between">
                {pageSize} {perPageLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {[5, 10, 20, 50, 100].map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => onPageSizeChange?.(size)}
                  className={pageSize === size ? "bg-accent" : ""}
                >
                  {size} {perPageLabel}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-none">
          <Button onClick={() => setCreateOpen(true)}>
            {TEXT.users?.table?.add ?? getText("users.table.add", lang === "es" ? "Agregar" : "Add")}
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => toggleSort("username")} className="cursor-pointer select-none">
              {TEXT.users?.table?.headers?.username ?? getText("users.table.headers.username", lang === "es" ? "Usuario" : "Username")} {renderSortIcon("username")}
            </TableHead>
            <TableHead onClick={() => toggleSort("firstName")} className="cursor-pointer select-none">
              {TEXT.users?.table?.headers?.firstName ?? getText("users.table.headers.firstName", lang === "es" ? "Nombre" : "First Name")} {renderSortIcon("firstName")}
            </TableHead>
            <TableHead onClick={() => toggleSort("lastName")} className="cursor-pointer select-none">
              {TEXT.users?.table?.headers?.lastName ?? getText("users.table.headers.lastName", lang === "es" ? "Apellido" : "Last Name")} {renderSortIcon("lastName")}
            </TableHead>
            <TableHead onClick={() => toggleSort("email")} className="cursor-pointer select-none">
              {TEXT.users?.table?.headers?.email ?? getText("users.table.headers.email", lang === "es" ? "Correo" : "Email")} {renderSortIcon("email")}
            </TableHead>

            {/* Encabezado de Estado centrado */}
            <TableHead className="w-[120px] text-center align-middle">
              {getText("users.table.headers.status", lang === "es" ? "Estado" : "Status")}
            </TableHead>

            {/* Centrar Rol para alinear con su celda (opcional pero consistente) */}
            <TableHead className="w-[120px] text-center align-middle">
              {getText("users.table.headers.role", lang === "es" ? "Rol" : "Role")}
            </TableHead>

            <TableHead className="w-[140px] text-center align-middle">
              {TEXT.users?.table?.headers?.actions ?? getText("users.table.headers.actions", lang === "es" ? "Acciones" : "Actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <button onClick={() => onSelectUser(user.id)} className="text-blue-600 hover:underline">
                  {user.username}
                </button>
              </TableCell>
              <TableCell>{user.firstName}</TableCell>
              <TableCell>{user.lastName}</TableCell>
              <TableCell>{user.email ?? "-"}</TableCell>

              {/* Celda de Estado centrada para que el icono quede directamente debajo del encabezado */}
              <TableCell className="text-center align-middle">
                {((user as any).is_active ?? user.isActive ?? true) ? (
                  <Check className="h-4 w-4 inline-block text-green-600" aria-label={getText("users.status.active", lang === "es" ? "Activo" : "Active")} />
                ) : (
                  <X className="h-4 w-4 inline-block text-red-500" aria-label={getText("users.status.inactive", lang === "es" ? "Inactivo" : "Inactive")} />
                )}
              </TableCell>

              <TableCell className="text-center align-middle">{renderRoleText(user)}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button size="icon" variant="ghost" onClick={() => setShowUser(user)}>
                  <Eye className="h-4 w-4 text-blue-500" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditUser(user)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteUser(user)}>
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Paginación */}
      <div className="flex justify-center">
        <ReusablePagination
          currentPage={effectivePage}
          totalPages={effectiveTotalPages}
          onPageChange={goToPage}
          showFirstLast={true}
          showPageInfo={true}
          pageInfoText={(current, total) =>
            // use pagination.pageInfo from TEXT, fallback localized
            getText(
              "pagination.pageInfo",
              lang === "es" ? `Página ${current} de ${total}` : `Page ${current} of ${total}`,
              { current: String(current), total: String(total) }
            )
          }
        />
      </div>

      {/* Modals */}
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
      {editUser && <EditUserDialog user={editUser} open={!!editUser} onClose={() => setEditUser(null)} onUpdated={onRefresh} />}
      {deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={onRefresh} />}
      {showUser && <ShowUserDialog user={showUser} open={!!showUser} onClose={() => setShowUser(null)} />}
    </div>
  );
}
