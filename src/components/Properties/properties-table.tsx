// src/components/Properties/PropertiesTable.tsx
"use client";

import { Pencil, Trash, Calendar, FileText, Plus, Eye, MapPin, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { addressAutocompleteService } from "@/lib/services/address-autocomplete";
import type { AppProperty } from "@/lib/services/properties";
import type { SortOrder } from "@/lib/sort";
import CreatePropertyDialog from "./Create/Create";
import DeletePropertyDialog from "./Delete/Delete";
import EditPropertyDialog from "./Edit/Edit";
import PropertyDetailsModal from "./PropertyDetailsModal";
import PropertyShiftsModal from "./properties shifts content/PropertyShiftsModal";
import PropertyNotesModal from "./PropertyNotesModal";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";

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
		<span className="cursor-help truncate block max-w-[200px]" title={text}>
			{text.substring(0, maxLength)}...
		</span>
	);
}

export interface PropertiesTableProps {
	properties: AppProperty[];
	onRefresh?: () => Promise<void>;
	serverSide?: boolean;
	currentPage?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	pageSize?: number;
	onPageSizeChange?: (size: number) => void;
	onSearch?: (term: string) => void;
	propertyTypesMap?: Record<number, string>;
	isPageLoading?: boolean;

	sortField: keyof AppProperty;
	sortOrder: SortOrder;
	toggleSort: (key: keyof AppProperty) => void;
}

export default function PropertiesTable({
	properties,
	onRefresh,
	serverSide = false,
	currentPage = 1,
	totalPages = 1,
	onPageChange,
	pageSize = 5,
	onPageSizeChange,
	onSearch,
	propertyTypesMap,
	sortField,
	sortOrder,
	toggleSort,
	isPageLoading,
}: PropertiesTableProps) {
	const navigate = useNavigate();
	const { TEXT } = useI18n();

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

	const propertyTable = (TEXT.properties && (TEXT.properties as any).table) ?? (TEXT.properties as any) ?? {};

	// Estado para modo compacto de acciones, guardado en localStorage
	const [isActionsGrouped, setIsActionsGrouped] = React.useState(() => {
		try {
			const saved = localStorage.getItem('properties-table-actions-grouped');
			return saved ? JSON.parse(saved) : true; // Por defecto compacto (true)
		} catch {
			return true; // Por defecto compacto
		}
	});

	// Efecto para guardar en localStorage cuando cambie el estado
	React.useEffect(() => {
		try {
			localStorage.setItem('properties-table-actions-grouped', JSON.stringify(isActionsGrouped));
		} catch (error) {
			console.warn('No se pudo guardar la configuración en localStorage:', error);
		}
	}, [isActionsGrouped]);

	// Estados para modales
	const [createOpen, setCreateOpen] = React.useState(false);
	const [editProperty, setEditProperty] = React.useState<AppProperty | null>(null);
	const [deleteProperty, setDeleteProperty] = React.useState<AppProperty | null>(null);
	const [detailsProperty, setDetailsProperty] = React.useState<AppProperty | null>(null);
	const [shiftsProperty, setShiftsProperty] = React.useState<AppProperty | null>(null);
	const [notesProperty, setNotesProperty] = React.useState<AppProperty | null>(null);

	const handleAddressClick = async (property: AppProperty & { ownerName: string; typesOfServiceStr: string }) => {
		if (!property.address || property.address.trim() === "") {
			console.warn("No address available for property:", property.id);
			return;
		}

		try {
			const suggestions = await addressAutocompleteService.searchAddresses(property.address, 'us');
			
			if (suggestions.length > 0) {
				const bestMatch = suggestions[0];
				const lat = parseFloat(bestMatch.lat);
				const lon = parseFloat(bestMatch.lon);
				
				if (!isNaN(lat) && !isNaN(lon)) {
					navigate('/map', {
						state: {
							propertyPin: {
								address: property.address,
								name: property.name || `Property #${property.id}`,
								lat,
								lon
							}
						}
					});
					return;
				}
			}
			
			console.warn("Could not geocode address:", property.address);
			navigate('/map');
			
		} catch (error) {
			console.error("Error geocoding address:", error);
			navigate('/map');
		}
	};

	/**
	 * Normalización:
	 * - ownerName: intenta username, luego nombre completo, luego fallback a #ownerId
	 * - typesOfServiceStr: soporta arrays de objetos o ids
	 */
	const normalized = properties.map((p) => {
		const od: any = (p as any).ownerDetails ?? {};
		let ownerName = "";
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
			...(p as any),
			ownerName,
			typesOfServiceStr,
		} as AppProperty & { ownerName: string; typesOfServiceStr: string };
	});

	// Definir columnas para ReusableTable (con ancho simétrico como en GuardsTable)
	const columns: Column<AppProperty & { ownerName: string; typesOfServiceStr: string }>[] = [
		{
			key: "ownerName",
			label: getText("properties.table.headers.owner", "Owner"),
			sortable: true,
			width: "15%",
			minWidth: "80px",
			headerClassName: "px-2 py-2 text-xs text-center",
			cellClassName: "px-2 py-2 text-xs text-center",
			render: (property) => (
				<div className="truncate text-xs">{property.ownerName}</div>
			),
		},
		{
			key: "name",
			label: getText("properties.table.headers.name", "Name"),
			sortable: true,
			width: "15%",
			minWidth: "100px",
			headerClassName: "px-2 py-2 text-xs text-center",
			cellClassName: "px-2 py-2 text-xs text-center",
			render: (property) => <div className="truncate text-xs"><TruncatedText text={property.name || ""} maxLength={25} /></div>,
		},
		{
			key: "address",
			label: getText("properties.table.headers.address", "Address"),
			sortable: true,
			width: "20%",
			minWidth: "120px",
			headerClassName: "px-2 py-2 text-xs text-center",
			cellClassName: "px-2 py-2 text-xs text-center",
			render: (property) => (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						handleAddressClick(property);
					}}
					className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0 font-normal truncate text-xs block max-w-[200px] mx-auto"
					title="Ver en mapa"
				>
					{property.address || ""}
				</button>
			),
		},
		{
			key: "typesOfServiceStr",
			label: getText("properties.table.headers.serviceTypes", "Service Types"),
			sortable: false,
			width: "15%",
			minWidth: "100px",
			headerClassName: "px-2 py-2 text-xs text-center",
			cellClassName: "px-2 py-2 text-xs text-center",
			render: (property) => <div className="truncate text-xs"><TruncatedText text={property.typesOfServiceStr || "-"} maxLength={25} /></div>,
		},
		{
			key: "shiftsCount",
			label: getText("shifts.title", "Shifts"),
			sortable: false,
			width: "8%",
			minWidth: "60px",
			headerClassName: "px-2 py-2 text-xs text-center",
			cellClassName: "px-2 py-2 text-xs text-center",
			render: (property) => <div className="text-xs text-center">{property.shiftsCount ?? "-"}</div>,
		},
		{
			key: "contractStartDate",
			label: getText("properties.table.headers.contractStartDate", "Start Date"),
			sortable: true,
			width: "12%",
			minWidth: "90px",
			headerClassName: "px-2 py-2 text-xs text-center",
			cellClassName: "px-2 py-2 text-xs text-center",
			render: (property) => <div className="text-xs text-center">{property.contractStartDate ?? "-"}</div>,
		},
	];

	// Renderizar acciones (compacto o desplegado)
	const renderGroupedActions = (property: AppProperty & { ownerName: string; typesOfServiceStr: string }) => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={(e) => {
					e.stopPropagation();
					setDetailsProperty(property);
				}}>
					<Eye className="h-4 w-4 mr-2" />
					{getText("actions.view", "Ver detalles")}
				</DropdownMenuItem>

				<DropdownMenuItem onClick={(e) => {
					e.stopPropagation();
					handleAddressClick(property);
				}}>
					<MapPin className="h-4 w-4 mr-2" />
					{getText("properties.table.viewMap", "Ver en mapa")}
				</DropdownMenuItem>

				<DropdownMenuItem onClick={(e) => {
					e.stopPropagation();
					setShiftsProperty(property);
				}}>
					<Calendar className="h-4 w-4 mr-2" />
					{getText("properties.table.viewShifts", "Ver shifts")}
				</DropdownMenuItem>

				<DropdownMenuItem onClick={(e) => {
					e.stopPropagation();
					setNotesProperty(property);
				}}>
					<FileText className="h-4 w-4 mr-2" />
					{getText("properties.table.viewNotes", "Ver notas")}
				</DropdownMenuItem>

				<DropdownMenuItem onClick={(e) => {
					e.stopPropagation();
					// TODO: Implementar agregar nota rápida
					console.log("Agregar nota a propiedad:", property.id);
				}}>
					<Plus className="h-4 w-4 mr-2" />
					{getText("properties.table.addNote", "Agregar nota")}
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem onClick={(e) => {
					e.stopPropagation();
					setEditProperty(property);
				}}>
					<Pencil className="h-4 w-4 mr-2" />
					{getText("actions.edit", "Editar")}
				</DropdownMenuItem>

				<DropdownMenuItem onClick={(e) => {
					e.stopPropagation();
					setDeleteProperty(property);
				}}>
					<Trash className="h-4 w-4 mr-2" />
					{getText("actions.delete", "Eliminar")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const renderActions = (property: AppProperty & { ownerName: string; typesOfServiceStr: string }) => {
		if (isActionsGrouped) {
			return renderGroupedActions(property);
		}

		// Modo desplegado: todos los botones
		return (
			<div className="flex gap-2 justify-center items-center flex-wrap">
				{/* Ver detalles */}
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						setDetailsProperty(property);
					}}
					title={getText("actions.view", "Ver detalles")}
					className="h-8 w-8 p-0 flex-shrink-0"
				>
					<Eye className="h-3.5 w-3.5" />
				</Button>

				{/* Ver mapa */}
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						handleAddressClick(property);
					}}
					title={getText("properties.table.viewMap", "Ver en mapa")}
					className="h-8 w-8 p-0 flex-shrink-0"
				>
					<MapPin className="h-3.5 w-3.5" />
				</Button>

				{/* Ver shifts */}
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						setShiftsProperty(property);
					}}
					title={getText("properties.table.viewShifts", "Ver shifts")}
					className="h-8 w-8 p-0 flex-shrink-0"
				>
					<Calendar className="h-3.5 w-3.5" />
				</Button>

				{/* Ver notes */}
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						setNotesProperty(property);
					}}
					title={getText("properties.table.viewNotes", "Ver notas")}
					className="h-8 w-8 p-0 flex-shrink-0"
				>
					<FileText className="h-3.5 w-3.5" />
				</Button>

				{/* Agregar nota rápida */}
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						// TODO: Implementar agregar nota rápida
						console.log("Agregar nota a propiedad:", property.id);
					}}
					title={getText("properties.table.addNote", "Agregar nota")}
					className="h-8 w-8 p-0 flex-shrink-0"
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>

				{/* Editar */}
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						setEditProperty(property);
					}}
					title={getText("actions.edit", "Editar")}
					className="h-8 w-8 p-0 flex-shrink-0"
				>
					<Pencil className="h-3.5 w-3.5" />
				</Button>

				{/* Eliminar */}
				<Button
					size="sm"
					variant="ghost"
					onClick={(e) => {
						e.stopPropagation();
						setDeleteProperty(property);
					}}
					title={getText("actions.delete", "Eliminar")}
					className="h-8 w-8 p-0 flex-shrink-0 text-red-500 hover:text-red-600"
				>
					<Trash className="h-3.5 w-3.5" />
				</Button>
			</div>
		);
	};

	return (
		<>
			<ReusableTable
				className="text-sm"
				data={normalized}
				columns={columns}
				getItemId={(property) => property.id}
				onSelectItem={(id) => {
					const property = normalized.find((p) => p.id === Number(id));
					if (property) {
						setDetailsProperty(property);
					}
				}}
				title={propertyTable.title ?? getText("properties.title", "Properties Management")}
				searchPlaceholder={propertyTable.searchPlaceholder ?? getText("properties.table.searchPlaceholder", "Buscar propiedades...")}
				addButtonText={propertyTable.add ?? getText("properties.table.add", "Agregar")}
				onAddClick={() => setCreateOpen(true)}
				serverSide={serverSide}
				currentPage={currentPage}
				totalPages={totalPages}
				onPageChange={onPageChange}
				pageSize={pageSize}
				onPageSizeChange={onPageSizeChange}
				onSearch={onSearch}
				searchFields={["ownerName", "name", "address", "typesOfServiceStr", "alias", "description"]}
				sortField={sortField}
				sortOrder={sortOrder}
				toggleSort={(field) => {
					// Solo permitir ordenar por campos que existen en AppProperty
					const validFields: (keyof AppProperty)[] = ["name", "address", "contractStartDate", "createdAt", "alias"];
					if (validFields.includes(field as keyof AppProperty)) {
						toggleSort(field as keyof AppProperty);
					}
				}}
				actions={renderActions}
				actionsHeader="Actions"
				isPageLoading={isPageLoading}
				rightControls={
					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsActionsGrouped(!isActionsGrouped)}
						className="text-xs"
					>
						{isActionsGrouped ? getText("properties.table.compactMode", "Compacto") : getText("properties.table.expandedMode", "Desplegado")}
					</Button>
				}
			/>

			{/* Modales */}
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

			{detailsProperty && (
				<PropertyDetailsModal
					property={detailsProperty}
					open={!!detailsProperty}
					onClose={() => setDetailsProperty(null)}
				/>
			)}

			{shiftsProperty && (
				<PropertyShiftsModal
					propertyId={shiftsProperty.id}
					propertyName={shiftsProperty.name || `Property #${shiftsProperty.id}`}
					propertyAlias={shiftsProperty.alias}
					open={!!shiftsProperty}
					onClose={() => setShiftsProperty(null)}
				/>
			)}

			{notesProperty && (
				<PropertyNotesModal
					property={notesProperty}
					open={!!notesProperty}
					onClose={() => setNotesProperty(null)}
					onUpdated={onRefresh}
				/>
			)}
		</>
	);
}
