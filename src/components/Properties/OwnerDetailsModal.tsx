"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { getClient, CLIENT_KEY, type AppClient } from "@/lib/services/clients";
import { Mail, Phone, MapPin, Calendar, } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * OwnerDetailsModal — versión visualmente mejorada
 * - avatar con iniciales
 * - encabezado limpio con badge de estado
 * - grid con iconos y labels
 * - skeletons con layout similar a datos reales
 *
 * Ajustes: ahora sólo hay una X (en el header) y el campo Balance está oculto.
 */

type OwnerDetailsModalProps = {
  ownerId?: number | null;
  initialData?: Partial<AppClient> | undefined;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function OwnerDetailsModal({
  ownerId,
  initialData,
  open,
  onClose,
  onUpdated,
}: OwnerDetailsModalProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<
    AppClient & { user?: number },
    unknown
  >({
    queryKey: [CLIENT_KEY, ownerId],
    queryFn: async () => {
      if (ownerId == null) throw new Error("ownerId no proporcionado");
      return getClient(ownerId);
    },
    enabled: open && ownerId != null,
    initialData: initialData as any | undefined,
    staleTime: 60 * 1000,
  });

  const handleRefresh = React.useCallback(async () => {
    if (ownerId == null) return;
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: [CLIENT_KEY, ownerId] });
      onUpdated?.();
    } catch {
      // noop
    }
  }, [ownerId, refetch, queryClient, onUpdated]);

  const name = React.useMemo(() => {
    if (!data) return undefined;
    const first = (data as any).firstName ?? (data as any).first_name ?? "";
    const last = (data as any).lastName ?? (data as any).last_name ?? "";
    const username = (data as any).username ?? undefined;
    if (first || last) return `${first} ${last}`.trim();
    return username ?? `#${(data as any).user ?? data.id}`;
  }, [data]);

  const initials = React.useMemo(() => {
    if (!name) return "";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  function formatDateMaybe(dateish?: string | null | undefined) {
    if (!dateish) return "-";
    try {
      const d = new Date(dateish);
      if (Number.isNaN(d.getTime())) return String(dateish);
      return d.toLocaleString();
    } catch {
      return String(dateish);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 w-full">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xl font-semibold shadow">
                {initials || "U"}
              </div>
              <div>
                <DialogTitle className="text-lg leading-5">
                  {name ?? "Propietario"}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2">
                  {(data as any)?.username && (
                    <div className="text-sm text-muted-foreground">
                      @{(data as any).username}
                    </div>
                  )}
                  <Badge
                    variant={(data as any)?.isActive ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {(data as any)?.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </div>

     
          </div>
        </DialogHeader>

        <div className="mt-4">
          {(isLoading || isFetching) && (
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-3/4 bg-muted rounded" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-muted rounded" />
                <div className="h-12 bg-muted rounded" />
              </div>
              <div className="h-10 bg-muted rounded" />
            </div>
          )}

          {!isLoading && !isFetching && data && (
            <div className="mt-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem
                  icon={<Mail className="h-4 w-4" />}
                  label="Correo"
                  value={data.email ?? "-"}
                />
                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Teléfono"
                  value={data.phone ?? "-"}
                />
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Dirección"
                  value={(data as any).address ?? "-"}
                />
                {/* Balance oculto a petición */}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Creado"
                  value={formatDateMaybe(
                    (data as any).created_at ?? (data as any).createdAt
                  )}
                />
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label="Actualizado"
                  value={formatDateMaybe(
                    (data as any).updated_at ?? (data as any).updatedAt
                  )}
                />
              </div>
            </div>
          )}

          {!isLoading && !isFetching && !data && !isError && (
            <div className="text-sm text-muted-foreground">
              No se encontraron datos del propietario.
            </div>
          )}

          {isError && (
            <div className="text-sm text-red-600">
              Error al cargar propietario:{" "}
              {(error as any)?.message ?? String(error)}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-end gap-2 w-full">
            {/* Sólo botón de refrescar (la X en el header cierra) */}
            <Button onClick={handleRefresh}>Refrescar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pequeño subcomponente para mostrar label + icon + value
 */
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-muted-foreground">{icon}</div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
