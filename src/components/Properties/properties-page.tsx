"use client";

import {
	keepPreviousData,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import * as React from "react";
import type { PaginatedResult } from "@/lib/pagination";
import {
	listProperties,
	// getProperty, // Comentado temporalmente porque no se usa actualmente
	PROPERTY_KEY,
	type AppProperty,
} from "@/lib/services/properties";
import PropertiesTable from "./properties-table";

const INITIAL_PROPERTY_DATA: PaginatedResult<AppProperty> = {
	items: [],
	count: 0,
	next: null,
	previous: null,
};

export default function PropertiesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = React.useState<number>(1);
	const [search, setSearch] = React.useState<string>("");
	
	// Page size con persistencia en sesión, valor por defecto 5
	const [pageSize, setPageSize] = React.useState<number>(() => {
		if (typeof window !== 'undefined') {
			const saved = sessionStorage.getItem('properties-page-size');
			return saved ? parseInt(saved, 10) : 5;
		}
		return 5;
	});

	// Guardar pageSize en sesión cuando cambie
	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('properties-page-size', pageSize.toString());
		}
	}, [pageSize]);

	const handlePageSizeChange = React.useCallback((newPageSize: number) => {
		setPage(1); // Reset a página 1 cuando cambie el page size
		setPageSize(newPageSize);
	}, []);

	const { data, isPending, error } = useQuery<PaginatedResult<AppProperty>, string>({
		queryKey: [PROPERTY_KEY, search, page, pageSize],
		queryFn: () => listProperties(page, search, pageSize),
		placeholderData: keepPreviousData,
		initialData: INITIAL_PROPERTY_DATA,
	});

	const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / pageSize));

	// const [selectedPropertyId, setSelectedPropertyId] = React.useState<number | null>(null);
	// Comentado temporalmente porque no se usa actualmente y rompe la build con TS6133

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<h2 className="text-2xl font-bold">Gestión de Propiedades</h2>

			{error && (
				<div className="rounded-lg border bg-card p-4 text-red-600">{String(error)}</div>
			)}

			{isPending && (
				<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
					<p>Cargando propiedades...</p>
				</div>
			)}

			<PropertiesTable
			properties={data?.items ?? []}
			// onSelectProperty={(id) => setSelectedPropertyId(id)}
			onRefresh={() => queryClient.invalidateQueries({ queryKey: [PROPERTY_KEY] })}
			serverSide={true}
			currentPage={page}
			totalPages={totalPages}
				onPageChange={(p) => setPage(p)}
				pageSize={pageSize}
				onSearch={(term) => setSearch(term)}
				onPageSizeChange={handlePageSizeChange}
			/>

			{/* Si en el futuro quieres volver a mostrar detalles, descomenta el state y el componente PropertyDetails */}
		</div>
	);
}

/* ------------------------------------------------------------------
   PropertyDetails: comentado porque actualmente no se utiliza y
   provoca TS6133 (declarado pero nunca leído). Si más adelante
   quieres mostrar detalles, descomenta esta función y la parte en
   el JSX que la renderice.
------------------------------------------------------------------- */

/*
function PropertyDetails({ selectedPropertyId }: Readonly<{ selectedPropertyId: number | null }>) {
	const { data } = useQuery({
		queryKey: [PROPERTY_KEY, selectedPropertyId],
		queryFn: () => getProperty(selectedPropertyId ?? 0),
		enabled: selectedPropertyId != null,
	});

	if (!data) {
		return (
			<div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
				<p className="text-sm text-muted-foreground">Selecciona una propiedad para ver sus detalles.</p>
			</div>
		);
	}

	const label = data.name ? `${data.name} (${data.address})` : `${data.address} (#${data.id})`;

	return (
		<div className="rounded-lg border bg-card p-4">
			<h3 className="font-semibold">{label}</h3>
			<p className="text-sm text-muted-foreground">Owner user: {data.ownerDetails?.user ?? `#${data.ownerId}`}</p>
			<p className="text-sm text-muted-foreground">Monthly rate: {data.monthlyRate ?? '-'}</p>
			<p className="text-sm text-muted-foreground">Total hours: {data.totalHours ?? '-'}</p>
		</div>
	);
}
*/

