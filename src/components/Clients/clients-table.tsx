// src/components/Clients/ClientsTable.tsx
"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
// <-- IMPORT DEL SCROLLAREA de shadcn
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import { shouldShowPage } from "../_utils/pagination";
import CreateClientDialog from "./Create/Create";
import DeleteClientDialog from "./Delete/Delete";
import EditClientDialog from "./Edit/Edit";
import type { Client as AppClient, Client } from "./types";
import PageSizeSelector from "@/components/ui/PageSizeSelector";
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
	
	hideBalance = true, // <- ocultamos por defecto según tu petición
  onPageSizeChange,
	sortField,
	sortOrder,
	toggleSort,
}: ClientsTableProps) {
	const { TEXT } = useI18n();
	const [page, setPage] = React.useState(1);
	const [search, setSearch] = React.useState("");

	const [createOpen, setCreateOpen] = React.useState(false);
	const [editClient, setEditClient] = React.useState<AppClient | null>(null);
	const [deleteClient, setDeleteClient] = React.useState<AppClient | null>(
		null,
	);

	// local page size (used only when not serverSide)
	const itemsPerPage = pageSize ?? 5;

	// highlight flag for initial blink/pulse
	const [highlightSearch, setHighlightSearch] = React.useState(true);
	const searchRef = React.useRef<HTMLInputElement | null>(null);

	// Normalize fields and compute clientName
	const normalizedClients = clients.map((c) => {
		const firstName = c.firstName ?? (c as any).first_name ?? "";
		const lastName = c.lastName ?? (c as any).last_name ?? "";
		const clientName =
			firstName || lastName
				? `${firstName} ${lastName}`.trim()
				: (c.username ?? (c as any).name ?? "");
		return {
			...c,
			firstName,
			lastName,
			clientName,
		} as AppClient & { clientName: string };
	});

	const localFilteredAndSorted = normalizedClients.filter((c) => {
		const q = (search ?? "").toLowerCase();
		if (!q) return true;
		const clientName = (c as any).clientName ?? "";
		return (
			clientName.toLowerCase().includes(q) ||
			(c.firstName ?? "").toLowerCase().includes(q) ||
			(c.lastName ?? "").toLowerCase().includes(q) ||
			(c.email ?? "").toLowerCase().includes(q) ||
			(c.phone ?? "").toLowerCase().includes(q)
		);
	});

	// When serverSide is true, do not filter/sort locally; rely on backend
	const effectiveList = serverSide ? normalizedClients : localFilteredAndSorted;

	// Determine pagination values depending on mode
	const localTotalPages = Math.max(
		1,
		Math.ceil(localFilteredAndSorted.length / itemsPerPage),
	);
	const effectiveTotalPages = serverSide
		? Math.max(1, totalPages ?? 1)
		: localTotalPages;
	const effectivePage = serverSide
		? Math.max(1, Math.min(currentPage, effectiveTotalPages))
		: page;

	const startIndex = (effectivePage - 1) * itemsPerPage;
	const paginatedClients = serverSide
		? effectiveList // parent supplies already-paginated contents
		: effectiveList.slice(startIndex, startIndex + itemsPerPage);

	React.useEffect(() => {
		// when source clients change or search changes, reset local page if not serverSide
		if (!serverSide) {
			setPage(1);
		}
	}, [clients.length, search, serverSide]);

	// Debounce server-side search by 350ms
	const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
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

	React.useEffect(() => {
		// Focus the search input and keep the highlight for ~3.5s when component mounts
		if (searchRef.current) {
			try {
				searchRef.current.focus();
			} catch {}
		}
		const t = setTimeout(() => setHighlightSearch(false), 3500);
		return () => clearTimeout(t);
	}, []);

	const goToPage = (p: number) => {
		const newP = Math.max(1, Math.min(effectiveTotalPages, p));
		if (serverSide) {
			onPageChange?.(newP);
		} else {
			setPage(newP);
		}
	};

	const renderSortIcon = (field: keyof AppClient) => {
		if (sortField !== field)
			return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
		return sortOrder === "asc" ? (
			<ArrowUp className="ml-1 h-3 w-3 inline" />
		) : (
			<ArrowDown className="ml-1 h-3 w-3 inline" />
		);
	};

	// Render pagination control (works for serverSide or local)
	const renderPagination = () => {
		const pages = effectiveTotalPages;
		const active = effectivePage;

		return (
			<Pagination>
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							onClick={() => goToPage(active - 1)}
							className={active === 1 ? "pointer-events-none opacity-50" : ""}
						/>
					</PaginationItem>

					{Array.from({ length: pages }, (_, i) => i)
						.filter((item) => shouldShowPage(item, active, pages))
						.map((item) => (
							<PaginationItem key={item}>
								<PaginationLink
									isActive={effectivePage === item + 1}
									onClick={() => goToPage(item + 1)}
								>
									{item + 1}
								</PaginationLink>
							</PaginationItem>
						))}

					<PaginationItem>
						<PaginationNext
							onClick={() => goToPage(active + 1)}
							className={
								active === pages ? "pointer-events-none opacity-50" : ""
							}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
		);
	};
	 const clientsTable =
  (TEXT.clients && (TEXT.clients as any).list) ?? (TEXT.clients as any) ?? {};
	return (
		<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
			{/* Header row: Title | Search | Add button */}
			<div className="flex flex-col md:flex-row items-center gap-3 justify-between">
				<h3 className="text-lg font-semibold md:mr-4">
					{TEXT.clients.list.title}
				</h3>

				<div className="flex-1 md:mx-4 w-full max-w-3xl">
					<div
						className={`${highlightSearch ? "search-highlight search-pulse" : ""}`}
						style={{ minWidth: 280 }}
					>
						<Input
							ref={searchRef}
							placeholder={TEXT.clients.list.searchPlaceholder}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full"
							aria-label={TEXT.clients.list.searchPlaceholder}
						/>
					</div>
				</div>

<div className="flex-none mr-2">
		  <PageSizeSelector
			pageSize={pageSize}
			onChange={(s) => {
			  onPageSizeChange?.(s);
			  if (!serverSide) setPage(1);
			}}
			ariaLabel={clientsTable.pageSizeLabel ?? "Items per page"}
		  />
		  </div>

				<div className="flex-none">
					<Button onClick={() => setCreateOpen(true)}>
						{TEXT.clients.list.addClient}
					</Button>
				</div>
			</div>

			{/* ========== Aquí añadí ScrollArea + max-h para evitar overflow ========== */}
			<ScrollArea className="rounded-md border">
				<div className="max-h-[48vh]">
					{/* Mantengo un min-width para evitar que la tabla se rompa en pantallas grandes;
              ajusta o quita si prefieres que ocupe todo el ancho */}
					<div className="min-w-[60vw]">
						<Table className="table-fixed w-full border-collapse">
							{/* header sticky para que siempre sea visible al scrollear */}
							<TableHeader className="sticky top-0 z-20 bg-card border-b">
								<TableRow>
									<TableHead
										onClick={() => toggleSort("firstName")}
										className="cursor-pointer select-none"
									>
										{TEXT.clients.list.headers.clientName}{" "}
										{renderSortIcon("firstName")}
									</TableHead>
									<TableHead
										onClick={() => toggleSort("email")}
										className="cursor-pointer select-none"
									>
										{TEXT.clients.list.headers.email} {renderSortIcon("email")}
									</TableHead>
									<TableHead
										onClick={() => toggleSort("phone")}
										className="cursor-pointer select-none"
									>
										{TEXT.clients.list.headers.phone} {renderSortIcon("phone")}
									</TableHead>

									{/* balance header hidden when hideBalance === true */}
									{!hideBalance && (
										<TableHead
											onClick={() => toggleSort("balance")}
											className="cursor-pointer select-none"
										>
											{TEXT.clients.list.headers.balance}{" "}
											{renderSortIcon("balance")}
										</TableHead>
									)}

									<TableHead className="w-[120px]">
										{TEXT.clients.list.headers.status}
									</TableHead>
									<TableHead className="w-[100px] text-center">
										{TEXT.clients.list.headers.actions}
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{paginatedClients.map((client, idx) => {
									const clientName =
										((client as any).clientName ??
											`${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()) ||
										"-";
									return (
										<TableRow
											key={client.id}
											className={`cursor-pointer hover:bg-muted ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/5"}`}
											onClick={() => onSelectClient(client.id)}
											role="button"
											tabIndex={0}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													onSelectClient(client.id);
												}
											}}
										>
											<TableCell>
												<div className="w-full">
													{/* name is plain text now (no blue) */}
													<span>{clientName}</span>
												</div>
											</TableCell>
											<TableCell>
												 <ClickableEmail email={client.email || ""} />
											</TableCell>
											<TableCell>{client.phone ?? "-"}</TableCell>

											{/* balance cell hidden when hideBalance === true */}
											{!hideBalance && (
												<TableCell>{client.balance ?? "-"}</TableCell>
											)}

											<TableCell>
												{(client.isActive ?? true)
													? TEXT.clients.list.statusActive
													: TEXT.clients.list.statusInactive}
											</TableCell>
											<TableCell className="flex gap-2 justify-center">
												<Button
													size="icon"
													variant="ghost"
													onClick={(e) => {
														e.stopPropagation();
														setEditClient(client);
													}}
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
												>
													<Trash className="h-4 w-4 text-red-500" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</div>
			</ScrollArea>

			<div className="flex justify-end">{renderPagination()}</div>

			<CreateClientDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreated={onRefresh}
			/>
			{editClient && (
				<EditClientDialog
					client={editClient}
					onClose={() => setEditClient(null)}
					onUpdated={onRefresh}
				/>
			)}
			{deleteClient && (
				<DeleteClientDialog
					client={deleteClient}
					onClose={() => setDeleteClient(null)}
					onDeleted={onRefresh}
				/>
			)}
		</div>
	);
}
