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
	
	// Estado para mantener totalPages estable durante loading
	const [stableTotalPages, setStableTotalPages] = React.useState<number>(1);

	const { data, isFetching, error } = useQuery<
		PaginatedResult<AppProperty>,
		string
	>({
		queryKey: [PROPERTY_KEY, search, page, sortField, sortOrder],
		queryFn: () => listProperties(page, search, pageSize, sortField, sortOrder),
		placeholderData: keepPreviousData,
		initialData: INITIAL_PROPERTY_DATA,
	});

	// Actualizar totalPages solo cuando tenemos datos nuevos definitivos
	const totalPages = React.useMemo(() => {
		const newTotalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));
		
		// Solo actualizar si:
		// 1. No estamos cargando Y tenemos datos
		// 2. O es la primera vez que tenemos datos (stableTotalPages === 1)
		if ((!isFetching && data?.count !== undefined) || stableTotalPages === 1) {
			setStableTotalPages(newTotalPages);
			return newTotalPages;
		}
		
		// Mientras cargamos, mantener el valor anterior
		return stableTotalPages;
	}, [data?.count, isFetching, stableTotalPages, pageSize]);

	const toggleSort = (field: keyof AppProperty) => {
		if (sortField === field) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortOrder("asc");
		}
	};

	const handleSearch = React.useCallback((term: string) => {
		setSearch(term);
		setPage(1); // Solo resetear página cuando realmente cambia la búsqueda
	}, []);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h2 className="text-2xl font-bold">Gestión de Propiedades</h2>

			{error && (
				<div className="rounded-lg border bg-card p-4 text-red-600">
					{String(error)}
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
				onPageChange={setPage}
				pageSize={pageSize}
				onSearch={handleSearch}
				toggleSort={toggleSort}
				sortField={sortField}
				sortOrder={sortOrder}
				isPageLoading={isFetching}
			/>
		</div>
	);
}
