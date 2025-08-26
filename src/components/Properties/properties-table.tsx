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
import { useI18n } from "@/i18n";
import CreatePropertyDialog from "./Create/Create";
import DeletePropertyDialog from "./Delete/Delete";
import EditPropertyDialog from "./Edit/Edit";

// Table primitives & Skeleton for loading state
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { TEXT } = useI18n();

  // Safe text getter to avoid TS errors when some keys are missing
  function getText(path: string, fallback?: string) {
    const parts = path.split(".");
    let val: any = TEXT as any;
    for (const p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (typeof val === "string") return val;
    return fallback ?? path;
  }

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

    if (!ownerName) ownerName = `#${(p as any).ownerId ?? (p as any).owner ?? p.id}`;

    // Procesar tipos de servicio
    let typesOfServiceStr = "";
    const tos: any =
      (p as any).typesOfService ?? (p as any).types_of_service ?? [];
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
      label: getText("properties.table.headers.owner", "Owner"),
      sortable: true,
      render: (p) => (
        <div className="w-full">
          <span>
            {(p as any).ownerName ??
              `#${(p as any).ownerId ?? (p as any).owner ?? p.id}`}
          </span>
        </div>
      ),
    },
    {
      key: "alias",
      label: getText("properties.table.headers.alias", "Nick"),
      sortable: true,
      render: (p) => <TruncatedText text={p.alias || "-"} maxLength={20} />,
    },
    {
      key: "name",
      label: getText("properties.table.headers.name", "Name"),
      sortable: true,
      render: (p) => <TruncatedText text={p.name || ""} maxLength={25} />,
    },
    {
      key: "address",
      label: getText("properties.table.headers.address", "Address"), // Esta columna (índice 3) se truncará
      sortable: true,
      render: (p) => <ClickableAddress address={p.address || ""} />,
    },
    {
      key: "typesOfService",
      label: getText("properties.table.headers.serviceTypes", "Service Types"),
      sortable: false,
      render: (p) => (
        <TruncatedText text={(p as any).typesOfServiceStr || "-"} maxLength={25} />
      ),
    },
    {
      key: "monthlyRate",
      label: getText("properties.table.headers.monthlyRate", "Monthly Rate"),
      sortable: true,
      render: (p) =>
        p.monthlyRate != null && p.monthlyRate !== ""
          ? `$ ${p.monthlyRate}`
          : "-",
    },
    {
      key: "totalHours",
      label: getText("properties.table.headers.totalHours", "Total Hours"),
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

  // Número de filas skeleton a mostrar (usa pageSize si está en serverSide)
  const skeletonRows = Math.max(3, pageSize ?? 5);

  return (
    <>
      {/* Si está cargando pagina, renderizamos una tabla-skeleton con la misma cantidad de columnas */}
      {isPageLoading ? (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{getText("properties.table.title", "Properties List")}</h3>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={String(col.key)} className="select-none">
                    {String(col.label)}
                  </TableHead>
                ))}
                <TableHead className="w-[120px] text-center">{getText("properties.table.headers.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Array.from({ length: skeletonRows }).map((_, rIndex) => (
                <TableRow key={`prop-skel-${rIndex}`}>
                  {columns.map((_, cIndex) => (
                    <TableCell key={`c-${cIndex}`}>
                      <Skeleton className="h-4 w-full max-w-[220px]" />
                    </TableCell>
                  ))}

                  <TableCell className="flex gap-2 justify-center">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Si no está cargando, usamos el ReusableTable normal
        <ReusableTable<any>
          data={normalizedProperties}
          columns={columns}
          getItemId={(p) => p.id}
          onSelectItem={(id) => onSelectProperty?.(Number(id))}
          title={getText("properties.table.title", "Properties List")}
          searchPlaceholder={getText("properties.table.searchPlaceholder", "Search properties...")}
          addButtonText={getText("properties.table.add", "Add")}
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
      )}

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
