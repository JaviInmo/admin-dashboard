// src/components/Guards/GuardWeaponsModal.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { GiPistolGun } from "react-icons/gi";
import { toast } from "sonner";
import { Plus, X, Calendar, Edit3, Trash2 } from "lucide-react";

import type { Guard } from "./types";
import type { Weapon } from "@/components/Weapons/types";
import { listWeaponsByGuard } from "@/lib/services/weapons";
import { WEAPONS_KEY } from "@/lib/services/weapons";
import type { PaginatedResult } from "@/lib/pagination";

import CreateWeaponDialog from "@/components/Weapons/Create/Create";
import EditWeaponDialog from "@/components/Weapons/Edit/Edit";
import DeleteWeaponDialog from "@/components/Weapons/Delete/Delete";

import { ReusableTable, type Column } from "@/components/ui/reusable-table";

interface Props {
  guard: Guard;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

export default function GuardWeaponsModal({
  guard,
  open,
  onClose,
  onUpdated,
}: Props) {
  const { TEXT } = useI18n();
  const queryClient = useQueryClient();

  // pagination & pageSize state (default 5)
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(5);

  const [showCreate, setShowCreate] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState<Weapon | null>(null);
  const [showDelete, setShowDelete] = React.useState<Weapon | null>(null);

  // track which guard's data we have successfully loaded last
  const [prevGuardId, setPrevGuardId] = React.useState<number | null>(null);

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>(searchTerm);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // reset pagination and prevGuardId when guard changes or modal opens/closes
  React.useEffect(() => {
    setPage(1);
    setSearchTerm("");
    setDebouncedSearch("");
    setPageSize(5);
    setPrevGuardId(null);
  }, [guard?.id, open]);

  // Query key includes guard.id, page, pageSize and debouncedSearch
  const queryKey = [WEAPONS_KEY, "by_guard", guard?.id ?? "none", page, pageSize, debouncedSearch] as const;

  // Tipamos explícitamente las options para que TS reconozca los campos aceptados por useQuery
  const queryOptions: UseQueryOptions<
    PaginatedResult<Weapon>,
    Error,
    PaginatedResult<Weapon>,
    typeof queryKey
  > = {
    queryKey,
    queryFn: async () => {
      if (!guard?.id) {
        return { count: 0, items: [], next: null, previous: null } as PaginatedResult<Weapon>;
      }
      return listWeaponsByGuard(guard.id, page, pageSize, undefined, debouncedSearch);
    },
    enabled: Boolean(open && guard?.id),
    staleTime: 0,
  };

  const { data, isFetching, error, isError } = useQuery(queryOptions);

  // cuando la query termina de cargar para el guard actual, registramos prevGuardId
  React.useEffect(() => {
    if (!isFetching && data && guard?.id) {
      setPrevGuardId(guard.id);
    }
  }, [isFetching, data, guard?.id]);

  React.useEffect(() => {
    if (isError && error) {
      toast.error(String((error as any)?.message ?? "Error fetching weapons"));
    }
  }, [isError, error]);

  // si no hemos cargado datos para este guard (prevGuardId distinto), mostramos vacío
  const items: Weapon[] = prevGuardId === guard?.id ? (data?.items ?? []) : [];

  // reset search/pagination when modal closes (ya manejado arriba, pero lo dejamos por claridad)
  React.useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setDebouncedSearch("");
      setPage(1);
      setPageSize(5);
      setPrevGuardId(null);
    }
  }, [open]);

  const handleCreated = async () => {
    toast.success((TEXT as any)?.weapons?.messages?.created ?? "Weapon created");
    setShowCreate(false);
    // invalidar sólo queries by_guard del guard actual para refrescar
    await queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === WEAPONS_KEY &&
        q.queryKey[1] === "by_guard" &&
        q.queryKey[2] === guard?.id,
    });
    if (onUpdated) await onUpdated();
  };

  const handleUpdated = async () => {
    setShowEdit(null);
    await queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === WEAPONS_KEY &&
        q.queryKey[1] === "by_guard" &&
        q.queryKey[2] === guard?.id,
    });
    if (onUpdated) await onUpdated();
  };

  const handleDeleted = async () => {
    setShowDelete(null);
    await queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === WEAPONS_KEY &&
        q.queryKey[1] === "by_guard" &&
        q.queryKey[2] === guard?.id,
    });
    if (onUpdated) await onUpdated();
  };

  const formatDate = (d?: string | Date | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return String(d);
    }
  };

  const columns: Column<Weapon>[] = [
    {
      key: "model",
      label: (TEXT as any)?.weapons?.table?.headers?.model ?? "Modelo",
      width: "40%",
      headerClassName: "text-left",
      cellClassName: "text-left py-1 text-sm truncate",
      render: (w) => w.model ?? "-",
    },
    {
      key: "serialNumber",
      label: (TEXT as any)?.weapons?.table?.headers?.serialNumber ?? "NoSerie",
      width: "25%",
      headerClassName: "text-left",
      cellClassName: "text-left py-1 text-sm truncate",
      render: (w) => w.serialNumber ?? "-",
    },
    {
      key: "createdAt",
      label: (TEXT as any)?.weapons?.table?.headers?.createdAt ?? "Creado",
      width: "30%",
      headerClassName: "text-left",
      cellClassName: "text-left py-1 text-sm text-muted-foreground truncate",
      render: (w) =>
        w.createdAt ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatDate(w.createdAt)}</span>
          </div>
        ) : (
          "-"
        ),
    },
  ];

  const actions = (w: Weapon) => (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setShowEdit(w)}
        className="h-6 w-6 p-0 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400"
        title="Editar"
        aria-label="editar"
      >
        <Edit3 className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => setShowDelete(w)}
        className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
        title="Eliminar"
        aria-label="eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const totalItems = data?.count ?? items.length;
  const totalPages = Math.max(1, Math.ceil((totalItems ?? 0) / pageSize));

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent
          size="xl"
          showCloseButton={false}
          className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden"
        >
          <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <GiPistolGun className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    {(TEXT as any)?.weapons?.panel?.title ?? "Armas Asignadas"}
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="font-medium">
                      {guard?.firstName} {guard?.lastName}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {totalItems} {totalItems === 1 ? "arma" : "armas"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={() => setShowCreate(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm">
                  <Plus className="h-4 w-4" />
                  {(TEXT as any)?.weapons?.panel?.add ?? "Agregar Arma"}
                </Button>

                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/80 dark:hover:bg-gray-800" aria-label="Cerrar">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/30 dark:bg-gray-900/30">
            <ReusableTable<Weapon>
              data={items}
              columns={columns}
              getItemId={(w) => w.id}
              className="p-0"
              serverSide={true}
              onSearch={(term) => {
                setSearchTerm(term);
                setPage(1);
              }}
              searchFields={["model", "serialNumber"]}
              pageSize={pageSize}
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              isPageLoading={isFetching}
              actions={(w) => actions(w)}
              actionsHeader={(TEXT as any)?.weapons?.table?.actionsHeader ?? "Acciones"}
            />
          </div>
        </DialogContent>
      </Dialog>

      {showCreate && (
        <CreateWeaponDialog open={showCreate} onClose={() => setShowCreate(false)} guardId={guard?.id ?? 0} lockGuard={true} onCreated={handleCreated} />
      )}

      {showEdit && (
        <EditWeaponDialog weapon={showEdit} open={!!showEdit} onClose={() => setShowEdit(null)} onUpdated={handleUpdated} />
      )}

      {showDelete && (
        <DeleteWeaponDialog weapon={showDelete} onClose={() => setShowDelete(null)} onDeleted={handleDeleted} />
      )}
    </>
  );
}
