"use client";

import { Pencil, Trash, Tag } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
import CreateGuardDialog from "./Create/Create";
import DeleteGuardDialog from "./Delete/Delete";
import EditGuardDialog from "./Edit/Edit";
import type { Guard } from "./types";
import { ClickableEmail } from "../ui/clickable-email";

/* Modal separado (import) */
import TariffModal from "./TarifModal";

export interface GuardsTableProps {
  guards: Guard[];
  onSelectGuard: (id: number) => void;
  onRefresh?: () => Promise<void> | void;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onSearch?: (term: string) => void;
  onPageSizeChange?: (size: number) => void;
  isPageLoading?: boolean;

  sortField: keyof Guard;
  sortOrder: SortOrder;
  toggleSort: (key: keyof Guard) => void;
}

export default function GuardsTable({
  guards,
  onSelectGuard,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onPageSizeChange,
  onSearch, // <-- AÑADIDO aquí
  isPageLoading = false,
  sortField,
  sortOrder,
  toggleSort,
}: GuardsTableProps) {
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

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editGuard, setEditGuard] = React.useState<Guard | null>(null);
  const [deleteGuard, setDeleteGuard] = React.useState<Guard | null>(null);

  // Nuevo: estado para abrir modal de tarifas
  const [tariffGuard, setTariffGuard] = React.useState<Guard | null>(null);

  // Access i18n keys
  const guardTable = (TEXT.guards && (TEXT.guards as any).table) ?? (TEXT.guards as any) ?? {};

  // Normaliza número para usar en enlace de wa.me
  function normalizePhoneForWhatsapp(raw?: string | null): string {
    if (!raw) return "";
    // quitar todo excepto dígitos y + y iniciales 00
    const trimmed = String(raw).trim();
    // eliminar paréntesis, espacios, guiones, puntos
    let cleaned = trimmed.replace(/[\s().\-]/g, "");
    // si comienza con +, quitar el +
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.slice(1);
      return cleaned.replace(/^0+/, ""); // quitar ceros innecesarios
    }
    // si comienza con 00, quitar los 00 (estándar internacional)
    if (cleaned.startsWith("00")) {
      cleaned = cleaned.replace(/^00+/, "");
      return cleaned;
    }
    // si contiene sólo dígitos, devolverlos tal cual
    const digits = cleaned.replace(/\D+/g, "");
    return digits;
  }

  // Definir las columnas de la tabla - correo (índice 2) será sacrificado
  const columns: Column<Guard>[] = [
    {
      key: "firstName",
      label: guardTable.headers?.name ?? getText("guards.table.headers.name", "Nombre"),
      sortable: true,
      render: (guard) => guard.firstName ?? "",
    },
    {
      key: "lastName",
      label: guardTable.headers?.lastName ?? getText("guards.table.headers.lastName", "Apellido"),
      sortable: true,
      render: (guard) => guard.lastName ?? "",
    },
    {
      key: "email",
      label: guardTable.headers?.email ?? getText("guards.table.headers.email", "Correo"),
      sortable: true,
      render: (guard) => <ClickableEmail email={guard.email || ""} />,
    },
    {
      key: "phone",
      label: guardTable.headers?.phone ?? getText("guards.table.headers.phone", "Teléfono"),
      sortable: false,
      render: (guard) => {
        const phone = guard.phone ?? "";
        if (!phone) return "-";

        const normalized = normalizePhoneForWhatsapp(phone);
        const waUrl = normalized ? `https://wa.me/${encodeURIComponent(normalized)}` : `https://wa.me/${encodeURIComponent(phone)}`;
        const linkTitle = getText("guards.table.whatsappTitle", "Abrir en WhatsApp", { phone });
        const ariaLabel = getText("guards.table.whatsappAria", "Abrir chat de WhatsApp con {phone}", { phone });

        return (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              // Evitar que el clic en el link dispare la selección de fila
              e.stopPropagation();
            }}
            title={linkTitle}
            aria-label={ariaLabel}
            className="text-blue-600 hover:underline"
          >
            {phone}
          </a>
        );
      },
    },
    {
      key: "ssn",
      label: guardTable.headers?.ssn ?? getText("guards.table.headers.ssn", "DNI/SSN"),
      sortable: false,
      render: (guard) => {
        // Intentar respetar una bandera de visibilidad por guardia si existe.
        // Buscamos varios nombres posibles para compatibilidad: ssn_visible, ssnVisible, is_ssn_visible
        const anyGuard = guard as any;
        const visible =
          anyGuard.ssn_visible === true ||
          anyGuard.ssnVisible === true ||
          anyGuard.is_ssn_visible === true ||
          false;

        const ssnValue = guard.ssn ?? "";
        if (!ssnValue) return "-";

        if (visible) {
          return ssnValue;
        }

        // Si no está visible, mostramos máscara (por defecto lo que definió i18n o "******")
        return guardTable.ssnHidden ?? "******";
      },
    },
    {
      key: "birthdate",
      label: guardTable.headers?.birthdate ?? getText("guards.table.headers.birthdate", "Fecha Nac."),
      sortable: false,
      render: (guard) => guard.birthdate ?? "-",
    },
  ];

  // Campos de búsqueda
  const searchFields: (keyof Guard)[] = ["firstName", "lastName", "email", "phone"];

  // Acciones de fila (ahora con icono de tarifas a la izquierda del edit)
  const renderActions = (guard: Guard) => (
    <>
      {/* Tariff button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setTariffGuard(guard);
        }}
        title={getText("guards.table.tariffsButton", "Tarifas")}
        aria-label={getText("guards.table.tariffsAria", "Tarifas de {name}", { name: `${guard.firstName ?? ""}` })}
      >
        <Tag className="h-4 w-4" />
      </Button>

      {/* Edit */}
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setEditGuard(guard);
        }}
        title={getText("actions.edit", "Editar")}
        aria-label={getText("actions.edit", "Editar")}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Delete */}
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteGuard(guard);
        }}
        title={getText("actions.delete", "Eliminar")}
        aria-label={getText("actions.delete", "Eliminar")}
      >
        <Trash className="h-4 w-4 text-red-500" />
      </Button>
    </>
  );

  return (
    <>
      <ReusableTable
        data={guards}
        columns={columns}
        getItemId={(guard) => guard.id}
        onSelectItem={(id) => onSelectGuard(Number(id))}
        title={guardTable.title ?? getText("guards.table.title", "Guards List")}
        searchPlaceholder={guardTable.searchPlaceholder ?? getText("guards.table.searchPlaceholder", "Buscar guardias...")}
        addButtonText={guardTable.add ?? guardTable.addButton ?? getText("guards.table.add", "Agregar")}
        onAddClick={() => setCreateOpen(true)}
        serverSide={serverSide}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onSearch={onSearch}
        searchFields={searchFields}
        sortField={sortField}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        actions={renderActions}
        isPageLoading={isPageLoading}
      />

      <CreateGuardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onRefresh}
      />
      {editGuard && (
        <EditGuardDialog
          guard={editGuard}
          open={!!editGuard}
          onClose={() => setEditGuard(null)}
          onUpdated={onRefresh}
        />
      )}
      {deleteGuard && (
        <DeleteGuardDialog
          guard={deleteGuard}
          onClose={() => setDeleteGuard(null)}
          onDeleted={onRefresh}
        />
      )}

      {/* Tariff modal (componente importado) */}
      {tariffGuard && (
        <TariffModal
          guard={tariffGuard}
          open={!!tariffGuard}
          onClose={() => setTariffGuard(null)}
          onSaved={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe && typeof (maybe as any).then === "function") {
                await maybe;
              }
            }
            setTariffGuard(null);
          }}
        />
      )}
    </>
  );
}
