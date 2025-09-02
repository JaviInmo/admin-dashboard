"use client";

import { Pencil, Trash, Tag, Calendar } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";
import type { SortOrder } from "@/lib/sort";
// ahora sí importamos CreateGuardDialog
import CreateGuardDialog from "./Create/Create";
import DeleteGuardDialog from "./Delete/Delete";
import EditGuardDialog from "./Edit/Edit";
import type { Guard } from "./types";
import { ClickableEmail } from "../ui/clickable-email";

/* Modal separado (import) */
import TariffModal from "./TarifModal";
import GuardDetailsModal from "./GuardDetailsModal";
import GuardsShiftsModal from "./GuardsShiftsModalImproved"; // Modal mejorado

export interface GuardsTableProps {
  guards: Guard[];
  onRefresh?: () => Promise<void> | void;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;

  onSearch?: (term: string) => void;

  isPageLoading?: boolean;

  sortField: keyof Guard;
  sortOrder: SortOrder;
  toggleSort: (key: keyof Guard) => void;
}

export default function GuardsTable({
  guards,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onPageSizeChange,
  onSearch,
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

  // const [createOpen, setCreateOpen] = React.useState(false); // <-- ahora lo usamos
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editGuard, setEditGuard] = React.useState<Guard | null>(null);
  const [deleteGuard, setDeleteGuard] = React.useState<Guard | null>(null);
  const [tariffGuard, setTariffGuard] = React.useState<Guard | null>(null);
  const [detailsGuard, setDetailsGuard] = React.useState<Guard | null>(null);

  // Nuevo estado: guard para abrir modal de Shifts
  const [shiftGuard, setShiftGuard] = React.useState<Guard | null>(null);

  const guardTable = (TEXT.guards && (TEXT.guards as any).table) ?? (TEXT.guards as any) ?? {};

  function normalizePhoneForWhatsapp(raw?: string | null): string {
    if (!raw) return "";
    const trimmed = String(raw).trim();
    let cleaned = trimmed.replace(/[\s().\-]/g, "");
    if (cleaned.startsWith("+")) {
      cleaned = cleaned.slice(1);
      return cleaned.replace(/^0+/, "");
    }
    if (cleaned.startsWith("00")) {
      cleaned = cleaned.replace(/^00+/, "");
      return cleaned;
    }
    const digits = cleaned.replace(/\D+/g, "");
    return digits;
  }

  const columns: Column<Guard>[] = [
    {
      key: "firstName",
      label: guardTable.headers?.name ?? getText("guards.table.headers.name", "Nombre"),
      sortable: true,
      render: (guard) => guard.firstName ?? "",
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
    },
    {
      key: "lastName",
      label: guardTable.headers?.lastName ?? getText("guards.table.headers.lastName", "Apellido"),
      sortable: true,
      render: (guard) => guard.lastName ?? "",
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
    },
    {
      key: "email",
      label: guardTable.headers?.email ?? getText("guards.table.headers.email", "Correo"),
      sortable: true,
      render: (guard) => <ClickableEmail email={guard.email || ""} />,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
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
              e.stopPropagation();
            }}
            title={linkTitle}
            aria-label={ariaLabel}
            className="text-blue-600 hover:underline text-sm"
          >
            {phone}
          </a>
        );
      },
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
      headerStyle: { width: "140px", minWidth: "120px", maxWidth: "180px" },
      cellStyle: { width: "140px", minWidth: "120px", maxWidth: "180px" },
    },
    {
      key: "ssn",
      label: guardTable.headers?.ssn ?? getText("guards.table.headers.ssn", "DNI/SSN"),
      sortable: false,
      render: (guard) => {
        const anyGuard = guard as any;
        const visible =
          anyGuard.ssn_visible === true ||
          anyGuard.ssnVisible === true ||
          anyGuard.is_ssn_visible === true ||
          false;

        const ssnValue = guard.ssn ?? "";
        if (!ssnValue) return "-";

        if (visible) {
          return <span className="text-sm">{ssnValue}</span>;
        }

        return <span className="text-sm">{guardTable.ssnHidden ?? "******"}</span>;
      },
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
      headerStyle: { width: "110px", minWidth: "90px", maxWidth: "140px" },
      cellStyle: { width: "110px", minWidth: "90px", maxWidth: "140px" },
    },
    {
      key: "birthdate",
      label: guardTable.headers?.birthdate ?? getText("guards.table.headers.birthdate", "Fecha Nac."),
      sortable: false,
      render: (guard) => <span className="text-sm">{guard.birthdate ?? "-"}</span>,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-1 text-sm",
      headerStyle: { width: "110px", minWidth: "90px", maxWidth: "140px" },
      cellStyle: { width: "110px", minWidth: "90px", maxWidth: "140px" },
    },
  ];

  const searchFields: (keyof Guard)[] = ["firstName", "lastName", "email", "phone"];

  const renderActions = (guard: Guard) => (
    <div className="flex items-center gap-1"> {/* gap reducido */}
      {/* Turnos */}
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setShiftGuard(guard);
        }}
        title={getText("guards.table.shiftsButton", "Turnos")}
        aria-label={getText("guards.table.shiftsAria", "Gestionar turnos de {name}", { name: `${guard.firstName ?? ""}` })}
      >
        <Calendar className="h-4 w-4" />
      </Button>

      {/* Tarifas */}
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
    </div>
  );

  return (
    <>
      <ReusableTable
        className="text-sm" // más compacto
        data={guards}
        columns={columns}
        getItemId={(guard) => guard.id}
        onSelectItem={(id) => {
          const guard = guards.find(g => g.id === Number(id));
          if (guard) {
            setDetailsGuard(guard);
          }
        }}
        title={guardTable.title ?? getText("guards.table.title", "Guards List")}
        searchPlaceholder={guardTable.searchPlaceholder ?? getText("guards.table.searchPlaceholder", "Buscar guardias...")}
        addButtonText={guardTable.add ?? guardTable.addButton ?? getText("guards.table.add", "Agregar")}
        onAddClick={() => setCreateOpen(true)} // <-- botón de crear ahora abre CreateGuardDialog
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

      {/* Create Guard dialog */}
      {createOpen && (
        <CreateGuardDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            if (onRefresh) {
              const maybe = onRefresh();
              if (maybe && typeof (maybe as any).then === "function") {
                await maybe;
              }
            }
            setCreateOpen(false);
          } } guardId={0}        />
      )}

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

      {detailsGuard && (
        <GuardDetailsModal
          guard={detailsGuard}
          open={!!detailsGuard}
          onClose={() => setDetailsGuard(null)}
        />
      )}

      {/* Nuevo: modal de Shifts */}
      {shiftGuard && (
        <GuardsShiftsModal
          guardId={shiftGuard.id}
          guardName={`${shiftGuard.firstName ?? ""} ${shiftGuard.lastName ?? ""}`.trim()}
          open={!!shiftGuard}
          onClose={() => setShiftGuard(null)}
        />
      )}
    </>
  );
}
