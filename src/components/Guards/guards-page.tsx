"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type { PaginatedResult } from "@/lib/pagination";
import { GUARDS_KEY, listGuards } from "@/lib/services/guard";
import type { SortOrder } from "@/lib/sort";
import GuardsTable from "./GuardsTable";
import type { Guard } from "./types";

/* import GuardDetailsTable from "./GuardDetailsTable"; */

const INITIAL_GUARD_DATA: PaginatedResult<Guard> = {
	items: [],
	count: 0,
	next: null,
	previous: null,
};

const pageSize = 20;

export default function GuardsPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = React.useState<number>(1);
	const [search, setSearch] = React.useState<string>("");
	const [sortField, setSortField] = React.useState<keyof Guard>("firstName");
	const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

	const handleSearch = React.useCallback((term: string) => {
		setPage(1);
		setSearch(term);
	}, []);

	const query = useQuery<PaginatedResult<Guard>, string>({
		queryKey: [GUARDS_KEY, search, page, sortField, sortOrder],
		queryFn: () => listGuards(page, search, pageSize, sortField, sortOrder),
	});

	// garantizar que `data` siempre sea del tipo PaginatedResult<Guard>
	const data = query.data ?? INITIAL_GUARD_DATA;
	const isLoading = query.isLoading;
	const error = query.error ?? null;

	// Backend siempre envía 20 elementos por página
	const totalPages = Math.max(1, Math.ceil((data.count ?? 0) / pageSize));

	const toggleSort = (field: keyof Guard) => {
		setSortField(field);
		setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
	};

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h2 className="text-2xl font-bold">Gestión de Guardias</h2>

			{error && (
				<div className="rounded-lg border bg-card p-4 text-red-600">
					{String(error)}
				</div>
			)}

			{isLoading && (
				<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
					<p>Cargando guardias...</p>
				</div>
			)}

			<GuardsTable
				guards={data.items}
				// aceptamos number | Guard pero aquí no guardamos el id (no se usa en esta página)
				onSelectGuard={(idOrGuard: number | Guard) => {
					// noop — si en el futuro querés usar la selección, restaurá el estado y lo manejo
					void idOrGuard;
				}}
				onRefresh={() =>
					// invalidar todas las queries relacionadas con GUARDS_KEY (search/page variantes incl.)
					queryClient.invalidateQueries({
						predicate: (query) =>
							Array.isArray(query.queryKey) && query.queryKey[0] === GUARDS_KEY,
					})
				}
				serverSide={true}
				currentPage={page}
				totalPages={totalPages}
				onPageChange={(p) => setPage(p)}
				pageSize={pageSize}
				onSearch={handleSearch}
				toggleSort={toggleSort}
				sortField={sortField}
				sortOrder={sortOrder}
			/>

			{/*  <GuardDetails selectedGuardId={selectedGuardId} /> */}
		</div>
	);
}
