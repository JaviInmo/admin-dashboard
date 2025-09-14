"use client";

import { Pencil, Trash, Tag, Calendar, MoreHorizontal } from "lucide-react";
import { List } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { useI18n } from "@/i18n";
import { GiPistolGun } from "react-icons/gi";
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

// Nuevo modal de armas del guardia
import GuardWeaponsModal from "./GuardWeaponsModal";

// Import modal de servicios del guardia
import GuardServicesModal from "./GuardServicesModal";

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

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editGuard, setEditGuard] = React.useState<Guard | null>(null);
  const [deleteGuard, setDeleteGuard] = React.useState<Guard | null>(null);
  const [tariffGuard, setTariffGuard] = React.useState<Guard | null>(null);
  const [detailsGuard, setDetailsGuard] = React.useState<Guard | null>(null);

  // Nuevo estado: guard para abrir modal de Shifts
  const [shiftGuard, setShiftGuard] = React.useState<Guard | null>(null);

  // Nuevo estado: guard para abrir modal de Weapons del guardia
  const [weaponsGuard, setWeaponsGuard] = React.useState<Guard | null>(null);

  // Nuevo estado: guard para abrir modal de Services del guardia
  const [servicesGuard, setServicesGuard] = React.useState<Guard | null>(null);

  // Estado para controlar si las acciones están agrupadas - guardado en localStorage
  const [isActionsGrouped, setIsActionsGrouped] = React.useState(() => {
    try {
      const saved = localStorage.getItem('guards-table-actions-grouped');
      return saved ? JSON.parse(saved) : true; // Por defecto compacto (true)
    } catch {
      return true; // Por defecto compacto
    }
  });

  // Efecto para guardar en localStorage cuando cambie el estado
  React.useEffect(() => {
    try {
      localStorage.setItem('guards-table-actions-grouped', JSON.stringify(isActionsGrouped));
    } catch (error) {
      console.warn('No se pudo guardar la configuración en localStorage:', error);
    }
  }, [isActionsGrouped]);

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

  // ---------------------------------------------------------------------------
  // Columns: comprimidas todavía más (nombre/apellido más pequeñas)
  // ---------------------------------------------------------------------------
  const columns: Column<Guard>[] = [
    {
      key: "firstName",
      label: guardTable.headers?.name ?? getText("guards.table.headers.name", "Nombre"),
      sortable: true,
      render: (guard) => <div className="truncate text-xs">{guard.firstName ?? ""}</div>,
      // padding reducido y fuente más pequeña
      headerClassName: "px-1 py-1 text-xs",
      cellClassName: "px-1 py-1 text-xs",
      // anchos compactos (más comprimidos)
      width: "110px",
      minWidth: "60px",
      maxWidth: "150px",
      headerStyle: { width: "110px", minWidth: "60px", maxWidth: "150px" },
      cellStyle: { width: "110px", minWidth: "60px", maxWidth: "150px" },
    },
    {
      key: "lastName",
      label: guardTable.headers?.lastName ?? getText("guards.table.headers.lastName", "Apellido"),
      sortable: true,
      render: (guard) => <div className="truncate text-xs">{guard.lastName ?? ""}</div>,
      headerClassName: "px-1 py-1 text-xs",
      cellClassName: "px-1 py-1 text-xs",
      width: "100px",
      minWidth: "50px",
      maxWidth: "140px",
      headerStyle: { width: "100px", minWidth: "50px", maxWidth: "140px" },
      cellStyle: { width: "100px", minWidth: "50px", maxWidth: "140px" },
    },
    {
      key: "email",
      label: guardTable.headers?.email ?? getText("guards.table.headers.email", "Correo"),
      sortable: true,
      render: (guard) => (
        <div className="truncate text-xs">
          <ClickableEmail email={guard.email || ""} />
        </div>
      ),
      headerClassName: "px-1 py-1 text-xs",
      cellClassName: "px-1 py-1 text-xs",
      // email tiene espacio para estirarse si hace falta, pero con un min razonable
      headerStyle: { minWidth: "140px", maxWidth: "420px" },
      cellStyle: { minWidth: "140px", maxWidth: "420px" },
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
            className="text-blue-600 hover:underline text-xs truncate block"
            style={{ maxWidth: 120 }}
          >
            {phone}
          </a>
        );
      },
      headerClassName: "px-1 py-1 text-xs",
      cellClassName: "px-1 py-1 text-xs",
      headerStyle: { width: "100px", minWidth: "80px", maxWidth: "140px" },
      cellStyle: { width: "100px", minWidth: "80px", maxWidth: "140px" },
    },

    // Si más columnas son necesarias, añadelas aquí (por ejemplo roles, activo, etc.)
  ];

  const searchFields: (keyof Guard)[] = ["firstName", "lastName", "email", "phone"];

  const renderGroupedActions = (guard: Guard) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setServicesGuard(guard);
        }}>
          <List className="h-4 w-4 mr-2" />
          {getText("guards.table.serviceButton", "Servicios")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setShiftGuard(guard);
        }}>
          <Calendar className="h-4 w-4 mr-2" />
          {getText("guards.table.shiftsButton", "Turnos")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setTariffGuard(guard);
        }}>
          <Tag className="h-4 w-4 mr-2" />
          {getText("guards.table.tariffsButton", "Tarifas")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setWeaponsGuard(guard);
        }}>
          <GiPistolGun className="h-4 w-4 mr-2" />
          {getText("guards.table.weaponsButton", "Armas")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setEditGuard(guard);
        }}>
          <Pencil className="h-4 w-4 mr-2" />
          {getText("actions.edit", "Editar")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => {
          e.stopPropagation();
          setDeleteGuard(guard);
        }}>
          <Trash className="h-4 w-4 mr-2" />
          {getText("actions.delete", "Eliminar")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderActions = (guard: Guard) => (
    isActionsGrouped ? renderGroupedActions(guard) : (
      <div className="flex items-center gap-1"> {/* gap reducido */}
        {/* Servicios del guard */}
       <Button
  size="icon"
  variant="ghost"
  onClick={(e) => {
    e.stopPropagation();
    setServicesGuard(guard);
  }}
  title={getText("guards.table.serviceButton", "Servicios")}
  aria-label={getText("guards.table.serviceAria", "Gestionar servicios de {name}", { name: `${guard.firstName ?? ""}` })}
>
  <List className="h-4 w-4" />
</Button>

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

      {/* Weapons: abrir panel de armas de este guard */}
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          console.debug("[GuardsTable] weapons button clicked for guard id=", guard.id);
          setWeaponsGuard(guard);
        }}
        title={getText("guards.table.weaponsButton", "Armas")}
        aria-label={getText("guards.table.weaponsAria", "Gestionar armas de {name}", { name: `${guard.firstName ?? ""}` })}
      >
        <GiPistolGun className="h-4 w-4" />
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
    )
  );

  return (
    <>
      <ReusableTable
        className="text-sm" // más compacto
        data={guards}
        columns={columns}
        getItemId={(guard) => guard.id}
        onSelectItem={(id) => {
          const guard = guards.find((g) => g.id === Number(id));
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
        rightControls={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsActionsGrouped(!isActionsGrouped)}
            className="text-xs"
          >
            {isActionsGrouped ? "Compacto" : "Desplegado"}
          </Button>
        }
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
          }}
          guardId={0}
        />
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

      {/* Nuevo: modal/panel de Weapons para el guard */}
      {weaponsGuard && (
        <GuardWeaponsModal
          guard={weaponsGuard}
          open={!!weaponsGuard}
          onClose={() => setWeaponsGuard(null)}
          onUpdated={onRefresh}
        />
      )}

      {/* Nuevo: modal/panel de Services para el guard */}
      {servicesGuard && (
        <GuardServicesModal
          open={!!servicesGuard}
          guardId={servicesGuard.id}
          guardName={`${servicesGuard.firstName ?? ""} ${servicesGuard.lastName ?? ""}`.trim()}
          onClose={() => setServicesGuard(null)}
          onUpdated={onRefresh}
        />
      )}
    </>
  );
}
