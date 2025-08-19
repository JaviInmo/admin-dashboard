"use client";

import {
	keepPreviousData,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";
import type { PaginatedResult } from "@/lib/pagination";
import {
	type AppProperty,
	listProperties,
	// getProperty, // Comentado temporalmente porque no se usa actualmente
	PROPERTY_KEY,
} from "@/lib/services/properties";
import type { SortOrder } from "@/lib/sort";
import PropertiesTable from "./properties-table";

const INITIAL_PROPERTY_DATA: PaginatedResult<AppProperty> = {
	items: [],
	count: 0,
	next: null,
	previous: null,
};

const pageSize = 10;

export default function PropertiesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = React.useState<number>(1);
	const [search, setSearch] = React.useState<string>("");
	const [sortField, setSortField] = React.useState<keyof AppProperty>("name");
	const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc");

	const { data, isPending, error } = useQuery<
		PaginatedResult<AppProperty>,
		string
	>({
		queryKey: [PROPERTY_KEY, search, page, sortField, sortOrder],
		queryFn: () => listProperties(page, search, pageSize, sortField, sortOrder),
		placeholderData: keepPreviousData,
		initialData: INITIAL_PROPERTY_DATA,
	});

	const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

	const toggleSort = (field: keyof AppProperty) => {
		setSortField(field);
		setSortOrder(sortField === field && sortOrder === "asc" ? "desc" : "asc");
	};

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h2 className="text-2xl font-bold">Gestión de Propiedades</h2>

			{error && (
				<div className="rounded-lg border bg-card p-4 text-red-600">
					{String(error)}
				</div>
			)}

			{isPending && (
				<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
					<p>Cargando propiedades...</p>
				</div>
			)}

			<PropertiesTable
				properties={data?.items ?? []}
				onRefresh={() =>
					queryClient.invalidateQueries({ queryKey: [PROPERTY_KEY] })
				}
				serverSide={true}
				currentPage={page}
				totalPages={totalPages}
				onPageChange={(p) => setPage(p)}
				pageSize={pageSize}
				onSearch={(term) => setSearch(term)}
				toggleSort={toggleSort}
				sortField={sortField}
				sortOrder={sortOrder}
			/>
		</div>
	);
}
