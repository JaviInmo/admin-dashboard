// src/components/Properties/PropertiesTable.tsx
"use client";

import { Pencil, Trash } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { ClickableAddress } from "@/components/ui/clickable-address";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppProperty } from "@/lib/services/properties";
import type { SortOrder } from "@/lib/sort";
import CreatePropertyDialog from "./Create/Create";
import DeletePropertyDialog from "./Delete/Delete";
import EditPropertyDialog from "./Edit/Edit";

// Componente helper para texto truncado con tooltip
function TruncatedText({
	text,
	maxLength = 30,
}: {
	text: string;
	maxLength?: number;
}) {
	if (!text || text.length <= maxLength) {
		return <span>{text}</span>;
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="cursor-help truncate block max-w-[200px]">
						{text.substring(0, maxLength)}...
					</span>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs">
					<p className="whitespace-normal break-words">{text}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export interface PropertiesTableProps {
	properties: AppProperty[];
	onSelectProperty?: (id: number) => void;
	onRefresh?: () => Promise<void>;
	serverSide?: boolean;
	currentPage?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	pageSize?: number;
	onSearch?: (term: string) => void;
	propertyTypesMap?: Record<number, string>;

	sortField: keyof AppProperty;
	sortOrder: SortOrder;
	toggleSort: (key: keyof AppProperty) => void;
	
	// Loading state para paginación
	isPageLoading?: boolean;
}

export default function PropertiesTable({
	properties,
	onSelectProperty,
	onRefresh,
	serverSide = false,
	currentPage = 1,
	totalPages = 1,
	onPageChange,
	pageSize = 5,
	onSearch,
	propertyTypesMap,
	sortField,
	sortOrder,
	toggleSort,
	isPageLoading = false,
}: PropertiesTableProps) {
	const [createOpen, setCreateOpen] = React.useState(false);
	const [editProperty, setEditProperty] = React.useState<AppProperty | null>(null);
	const [deleteProperty, setDeleteProperty] = React.useState<AppProperty | null>(null);

	// Normalizar los datos de propiedades
	const normalizedProperties = properties.map((p) => {
		const od: any = (p as any).ownerDetails ?? {};
		let ownerName = "";
		
		// Buscar el username del propietario
		const usernameCandidates = [od.username, od.user_username, od.user_name];
		for (const cand of usernameCandidates) {
			if (typeof cand === "string" && cand.trim() !== "") {
				ownerName = cand.trim();
				break;
			}
		}
		
		if (!ownerName) {
			const first = od.first_name ?? od.firstName ?? "";
			const last = od.last_name ?? od.lastName ?? "";
			if ((first || last) && `${first} ${last}`.trim() !== "")
				ownerName = `${first} ${last}`.trim();
		}
		
		if (!ownerName) {
			if (typeof od.user === "number") ownerName = `#${od.user}`;
		}
		
		if (!ownerName)
			ownerName = `#${(p as any).ownerId ?? (p as any).owner ?? p.id}`;

		// Procesar tipos de servicio
		let typesOfServiceStr = "";
		const tos: any = (p as any).typesOfService ?? (p as any).types_of_service ?? [];
		if (Array.isArray(tos)) {
			typesOfServiceStr = tos
				.map((t: any) => {
					if (!t && t !== 0) return null;
					if (typeof t === "object") {
						return String(t.name ?? t.title ?? t.id ?? "");
					}
					if (typeof t === "number") {
						return propertyTypesMap?.[t] ?? String(t);
					}
					if (typeof t === "string") {
						const n = Number(t);
						if (!Number.isNaN(n)) return propertyTypesMap?.[n] ?? t;
						return t;
					}
					return null;
				})
				.filter(Boolean)
				.join(", ");
		}

		return {
			...p,
			ownerName,
			typesOfServiceStr,
		};
	});

	// Definir las columnas de la tabla - la columna de dirección (índice 3) será sacrificada
	const columns: Column<any>[] = [
		{
			key: "ownerId",
			label: "Propietario",
			sortable: true,
			render: (p) => (
				<div className="w-full">
					<span>
						{(p as any).ownerName ?? `#${(p as any).ownerId ?? (p as any).owner ?? p.id}`}
					</span>
				</div>
			),
		},
		{
			key: "alias",
			label: "Alias",
			sortable: true,
			render: (p) => <TruncatedText text={p.alias || "-"} maxLength={20} />,
		},
		{
			key: "name",
			label: "Nombre",
			sortable: true,
			render: (p) => <TruncatedText text={p.name || ""} maxLength={25} />,
		},
		{
			key: "address",
			label: "Dirección", // Esta columna (índice 3) se truncará
			sortable: true,
			render: (p) => <ClickableAddress address={p.address || ""} />,
		},
		{
			key: "typesOfService",
			label: "Tipos de Servicio",
			sortable: false,
			render: (p) => (
				<TruncatedText
					text={(p as any).typesOfServiceStr || "-"}
					maxLength={25}
				/>
			),
		},
		{
			key: "monthlyRate",
			label: "Tarifa Mensual",
			sortable: true,
			render: (p) => p.monthlyRate ?? "-",
		},
		{
			key: "totalHours",
			label: "Horas Totales",
			sortable: true,
			render: (p) => p.totalHours ?? "-",
		},
	];

	// Campos de búsqueda
	const searchFields: (keyof AppProperty)[] = ["name", "alias", "address"];

	// Acciones de fila
	const renderActions = (property: AppProperty) => (
		<>
			<Button
				size="icon"
				variant="ghost"
				onClick={(e) => {
					e.stopPropagation();
					setEditProperty(property);
				}}
			>
				<Pencil className="h-4 w-4" />
			</Button>
			<Button
				size="icon"
				variant="ghost"
				onClick={(e) => {
					e.stopPropagation();
					setDeleteProperty(property);
				}}
			>
				<Trash className="h-4 w-4 text-red-500" />
			</Button>
		</>
	);

	return (
		<>
			<ReusableTable<any>
				data={normalizedProperties}
				columns={columns}
				getItemId={(p) => p.id}
				onSelectItem={(id) => onSelectProperty?.(Number(id))}
				title="Lista de Propiedades"
				searchPlaceholder="Buscar propiedades..."
				addButtonText="Agregar"
				onAddClick={() => setCreateOpen(true)}
				serverSide={serverSide}
				currentPage={currentPage}
				totalPages={totalPages}
				onPageChange={onPageChange}
				pageSize={pageSize}
				isPageLoading={isPageLoading}
				onSearch={onSearch}
				searchFields={searchFields}
				sortField={sortField as any}
				sortOrder={sortOrder}
				toggleSort={toggleSort as any}
				actions={renderActions}
			/>

			<CreatePropertyDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreated={onRefresh}
			/>
			{editProperty && (
				<EditPropertyDialog
					property={editProperty}
					open={!!editProperty}
					onClose={() => setEditProperty(null)}
					onUpdated={onRefresh}
				/>
			)}
			{deleteProperty && (
				<DeletePropertyDialog
					property={deleteProperty}
					open={!!deleteProperty}
					onClose={() => setDeleteProperty(null)}
					onDeleted={onRefresh}
				/>
			)}
		</>
	);
}
