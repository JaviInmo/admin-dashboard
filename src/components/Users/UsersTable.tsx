"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash } from "lucide-react";
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
	const { TEXT } = useI18n();

	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");
	const [createOpen, setCreateOpen] = React.useState(false);
	const [editUser, setEditUser] = React.useState<
		(User & { permissions?: Permissions }) | null
	>(null);
	const [deleteUser, setDeleteUser] = React.useState<User | null>(null);

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
				lastName:
					u.lastName ??
					(u.name ? u.name.split(" ").slice(-1).join("") : ""),
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

	const localTotalPages = Math.max(
		1,
		Math.ceil(effectiveList.length / itemsPerPage)
	);
	const effectiveTotalPages = serverSide
		? Math.max(1, totalPages ?? 1)
		: localTotalPages;
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

	const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null
	);

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
		if ((u as any).is_superuser || u.isSuperuser) return "Superuser";
		if ((u as any).is_staff || u.isStaff) return "Staff";
		return "Usuario";
	};

	// per-page label: intenta leer TEXT.users.table.perPage si existe, sino usa fallback
	const perPageLabel =
		(TEXT.users as any)?.table?.perPage ??
		(TEXT.users?.table?.searchPlaceholder?.includes("Buscar") ? "por página" : "per page");

	return (
		<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
			{/* Header con search y acciones */}
			<div className="flex flex-col md:flex-row items-center gap-3 justify-between">
				<h3 className="text-lg font-semibold md:mr-4">
					{TEXT.users?.table?.title ?? "Lista de Usuarios"}
				</h3>

				<div className="flex-1 md:mx-4 w-full max-w-3xl">
					<div
						className={`${highlightSearch ? "search-highlight search-pulse" : ""}`}
						style={{ minWidth: 280 }}
					>
						<Input
							ref={searchRef}
							placeholder={TEXT.users?.table?.searchPlaceholder ?? "Buscar..."}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full"
							aria-label={TEXT.users?.table?.searchPlaceholder ?? "Buscar usuarios"}
						/>
					</div>
				</div>

				{/* Selector de Page Size */}
				<div className="flex-none">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							{/* la clase de ancho va en el Button (child) */}
							<Button variant="outline" size="sm" className="min-w-32 justify-between">
								{pageSize} {perPageLabel}
							</Button>
						</DropdownMenuTrigger>

						{/* ancho del menú igual al del trigger */}
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
						{TEXT.users?.table?.add ?? "Agregar"}
					</Button>
				</div>
			</div>

			{/* Tabla */}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead onClick={() => toggleSort("username")} className="cursor-pointer select-none">
							{TEXT.users?.table?.headers?.username ?? "Username"} {renderSortIcon("username")}
						</TableHead>
						<TableHead onClick={() => toggleSort("firstName")} className="cursor-pointer select-none">
							{TEXT.users?.table?.headers?.firstName ?? "Nombre"} {renderSortIcon("firstName")}
						</TableHead>
						<TableHead onClick={() => toggleSort("lastName")} className="cursor-pointer select-none">
							{TEXT.users?.table?.headers?.lastName ?? "Apellido"} {renderSortIcon("lastName")}
						</TableHead>
						<TableHead onClick={() => toggleSort("email")} className="cursor-pointer select-none">
							{TEXT.users?.table?.headers?.email ?? "Correo"} {renderSortIcon("email")}
						</TableHead>
						<TableHead className="w-[120px]">{TEXT.users?.table?.headers?.permissions ?? "Estado"}</TableHead>
						<TableHead className="w-[120px]">Rol</TableHead>
						<TableHead className="w-[100px] text-center">{TEXT.users?.table?.headers?.actions ?? "Acciones"}</TableHead>
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
							<TableCell>
								{((user as any).is_active ?? user.isActive ?? true)
									? (TEXT.clients?.list?.statusActive ?? "Activo")
									: (TEXT.clients?.list?.statusInactive ?? "Inactivo")}
							</TableCell>
							<TableCell>{renderRoleText(user)}</TableCell>
							<TableCell className="flex gap-2 justify-center">
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
					pageInfoText={(current, total) => `Página ${current} de ${total}`}
				/>
			</div>

			{/* Modals */}
			<CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
			{editUser && <EditUserDialog user={editUser} open={!!editUser} onClose={() => setEditUser(null)} onUpdated={onRefresh} />}
			{deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={onRefresh} />}
		</div>
	);
}
