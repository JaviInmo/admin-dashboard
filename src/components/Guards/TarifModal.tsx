"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Guard } from "./types";
import { listProperties, type AppProperty } from "@/lib/services/properties";
import {
  listGuardPropertyTariffsByGuard,
  createGuardPropertyTariff,
  updateGuardPropertyTariff,
  deleteGuardPropertyTariff,
} from "@/lib/services/guardpt";
import { Trash, Pencil, Check, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { Skeleton } from "@/components/ui/skeleton";

type TariffItem = {
  id: number;
  guardId: number;
  propertyId: number;
  propertyLabel?: string;
  rate: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TariffModalProps = {
  guard: Guard;
  open: boolean;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
};

export default function TariffModal({
  guard,
  open,
  onClose,
  onSaved,
}: TariffModalProps) {
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

  const [allProperties, setAllProperties] = React.useState<
    Array<{ id: number; address?: string }>
  >([]);
  const [propsLoading, setPropsLoading] = React.useState(false);
  const [searchProp, setSearchProp] = React.useState<string>("");

  const [propsPanelOpen, setPropsPanelOpen] = React.useState<boolean>(true);

  const [tariffs, setTariffs] = React.useState<TariffItem[]>([]);
  const [tariffsLoading, setTariffsLoading] = React.useState(false);

  const [selectedProperty, setSelectedProperty] =
    React.useState<AppProperty | null>(null);
  const [editingTariff, setEditingTariff] = React.useState<TariffItem | null>(
    null
  );
  const [rate, setRate] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState(false);
  const [, setDeleting] = React.useState(false);

  const tariffsByProperty = React.useMemo(() => {
    const map = new Map<number, TariffItem>();
    for (const t of tariffs) map.set(Number(t.propertyId), t);
    return map;
  }, [tariffs]);

  const rateInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    resetForm();
    void loadProperties();
    void loadTariffs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guard?.id]);

  function resetForm() {
    setSelectedProperty(null);
    setEditingTariff(null);
    setRate("");
    setIsActive(true);
    setSearchProp("");
    setPropsPanelOpen(true);
  }

  async function loadProperties() {
    setPropsLoading(true);
    try {
      const resp = await listProperties(1, undefined, 500, undefined);
      const items = resp?.items ?? [];
      const simple = items.map((p: any) => ({
        id: p.id,
        address: p.address ?? p.name ?? String(p.id),
      }));
      setAllProperties(simple);
    } catch (err) {
      console.error("loadProperties error", err);
      setAllProperties([]);
    } finally {
      setPropsLoading(false);
    }
  }

  async function loadTariffs() {
    setTariffsLoading(true);
    try {
      const res = await listGuardPropertyTariffsByGuard(
        guard.id,
        1,
        undefined,
        500
      );
      const items = res?.items ?? [];

      const mapped: TariffItem[] = (items as any[]).map((t) => {
        const id = t.id ?? t.pk ?? 0;
        const guardId = t.guardId ?? t.guard ?? guard.id;
        const propertyId =
          t.propertyId ??
          t.property ??
          (t.property_details && t.property_details.id) ??
          (t.propertyDetails && t.propertyDetails.id) ??
          0;

        const propDetails = t.propertyDetails ?? t.property_details ?? {};
        const propertyLabel =
          propDetails?.address ??
          propDetails?.name ??
          propDetails?.alias ??
          t.propertyLabel ??
          `#${propertyId}`;

        const rate = String(t.rate ?? t.rate_per_hour ?? "");
        const isActive = Boolean(t.isActive ?? t.is_active);

        return {
          id,
          guardId,
          propertyId,
          propertyLabel,
          rate,
          isActive,
          createdAt: t.createdAt ?? t.created_at ?? null,
          updatedAt: t.updatedAt ?? t.updated_at ?? null,
        } as TariffItem;
      });

      setTariffs(mapped.filter((m) => Number(m.propertyId) > 0));
    } catch (err) {
      console.error("loadTariffs error", err);
      setTariffs([]);
    } finally {
      setTariffsLoading(false);
    }
  }

  const q = (searchProp ?? "").trim().toLowerCase();
  const filteredProps = React.useMemo(() => {
    if (!q) return allProperties;
    return allProperties.filter((p) => {
      const addr = String(p.address ?? "").toLowerCase();
      const id = String(p.id ?? "").toLowerCase();
      return addr.includes(q) || id.includes(q);
    });
  }, [allProperties, q]);

  function handleSelectExistingTariff(t: TariffItem) {
    setEditingTariff(t);
    setSelectedProperty({
      id: t.propertyId,
      address: t.propertyLabel,
    } as AppProperty);
    setRate(String(t.rate ?? ""));
    setIsActive(Boolean(t.isActive));
    setPropsPanelOpen(false);
    setTimeout(() => rateInputRef.current?.focus(), 0);
  }

  function handleChooseProperty(p: { id: number; address?: string }) {
    const existing = tariffsByProperty.get(Number(p.id));
    if (existing) {
      handleSelectExistingTariff(existing);
      return;
    }
    setEditingTariff(null);
    setSelectedProperty({ id: p.id, address: p.address } as AppProperty);
    setRate("");
    setIsActive(true);
    setPropsPanelOpen(false);
    setTimeout(() => rateInputRef.current?.focus(), 0);
  }

  async function handleSave() {
    if (!selectedProperty) {
      alert(getText("properties.form.ownerHelp", "Selecciona una propiedad primero."));
      return;
    }
    if (!rate || String(rate).trim() === "") {
      alert(getText("guards.tariffs.invalidRate", "Ingresa una tarifa válida (ej: 15.00)."));
      return;
    }

    const exists = tariffsByProperty.get(Number(selectedProperty.id));
    if (!editingTariff && exists) {
      alert(getText("guards.tariffs.exists", "Ya existe una tarifa para esta propiedad. Se cargará para editar."));
      handleSelectExistingTariff(exists);
      return;
    }

    setSaving(true);
    try {
      editingTariff && editingTariff.id
        ? await updateGuardPropertyTariff(editingTariff.id, {
            rate: String(rate),
            is_active: isActive,
          })
        : await createGuardPropertyTariff({
            guard: guard.id,
            property: selectedProperty.id,
            rate: String(rate),
            is_active: isActive,
          });

      await loadTariffs();
      resetForm();
    } catch (err) {
      console.error("handleSave error", err);
      alert(getText("guards.tariffs.saveError", "Error guardando tarifa (ver consola)."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(getText("guards.tariffs.confirmDelete", "¿Eliminar esta tarifa?"))) return;
    setDeleting(true);
    try {
      await deleteGuardPropertyTariff(id);
      await loadTariffs();
      if (editingTariff?.id === id) resetForm();
      if (onSaved) {
        const maybe = onSaved();
        if (maybe && typeof (maybe as any).then === "function") await maybe;
      }
    } catch (err) {
      console.error("handleDelete error", err);
      alert(getText("guards.tariffs.deleteError", "Error eliminando tarifa (ver consola)."));
    } finally {
      setDeleting(false);
    }
  }

  function propLabel(t: TariffItem) {
    return t.propertyLabel ?? `#${t.propertyId}`;
  }

  function formatRate(rate: string) {
    if (rate === null || rate === undefined) return "";
    const cleaned = String(rate).trim().replace(",", ".");
    const n = Number(cleaned);
    if (Number.isFinite(n)) {
      return `$${n.toFixed(2)}`;
    }
    return String(rate);
  }

  const guardLabel = `${guard.firstName ?? ""} ${guard.lastName ?? ""}`.trim() || `#${guard.id}`;

  // Small UI helper skeletons
  const TableRowSkeleton = ({ cols = 4 }: { cols?: number }) => (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-2 px-2 align-top">
          <Skeleton className="h-6 w-full rounded" />
        </td>
      ))}
    </tr>
  );

  const PropItemSkeleton = () => (
    <div className="p-2 rounded">
      <Skeleton className="h-4 w-3/4 rounded mb-1" />
      <Skeleton className="h-3 w-1/4 rounded" />
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>
            {getText("guards.tariffs.title", `Tarifas de {name}`, { name: guardLabel })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* ARRIBA: tarifas existentes */}
          <div>
            <div className="border rounded p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-sm">{getText("guards.tariffs.assignedLabel", "Tarifas asignadas")}</Label>
                  <div className="text-xs text-muted-foreground">
                    {getText("guards.tariffs.assignedNote", "Una tarifa por propiedad. Haz click para editar.")}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {tariffsLoading ? (
                    <Skeleton className="h-4 w-12 rounded" />
                  ) : (
                    getText("guards.tariffs.count", "{count} propiedad(es) con tarifa", { count: String(tariffs.length) })
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-auto">
                {tariffsLoading ? (
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="py-2 px-2 text-left w-2/5">{getText("properties.table.headers.name", "Propiedad")}</th>
                        <th className="py-2 px-2 text-left">{getText("guards.tariffs.rateHeader", "Tarifa")}</th>
                        <th className="py-2 px-2 text-left">{getText("guards.tariffs.activeHeader", "Activo")}</th>
                        <th className="py-2 px-2 text-right">{getText("actions.actions", "Acciones")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </tbody>
                  </table>
                ) : tariffs.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    {getText("guards.tariffs.empty", "Este guard no tiene tarifas asignadas.")}
                  </div>
                ) : (
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="py-2 px-2 text-left w-2/5">{getText("properties.table.headers.name", "Propiedad")}</th>
                        <th className="py-2 px-2 text-left">{getText("guards.tariffs.rateHeader", "Tarifa")}</th>
                        <th className="py-2 px-2 text-left">{getText("guards.tariffs.activeHeader", "Activo")}</th>
                        <th className="py-2 px-2 text-right">{getText("actions.actions", "Acciones")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tariffs.map((t) => (
                        <tr
                          key={t.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/20 transition-colors"
                          )}
                          onClick={() => handleSelectExistingTariff(t)}
                        >
                          <td className="py-2 px-2 align-top">
                            <div
                              className="max-w-[260px] truncate"
                              title={propLabel(t)}
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {propLabel(t)}
                            </div>
                          </td>

                          <td className="py-2 px-2 align-top">
                            {formatRate(t.rate)}
                          </td>

                          <td className="py-2 px-2 align-top">
                            {t.isActive ? (
                              <Check
                                className="h-4 w-4 text-green-600"
                                aria-label={getText("guards.tariffs.active", "Activo")}
                              />
                            ) : (
                              <X
                                className="h-4 w-4 text-red-500"
                                aria-label={getText("guards.tariffs.inactive", "Inactivo")}
                              />
                            )}
                          </td>

                          <td className="py-2 px-2 align-top text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectExistingTariff(t);
                                }}
                                title={getText("actions.edit", "Editar")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDelete(t.id);
                                }}
                                title={getText("actions.delete", "Eliminar")}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* ABAJO: buscador + formulario */}
          <div className="border rounded p-4 bg-card">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Columna izquierda: Buscar propiedad */}
              <div className="w-full md:w-1/2">
                <Label className="text-sm">{getText("properties.table.searchLabel", "Buscar propiedad")}</Label>
                <Input
                  placeholder={getText("properties.table.searchPlaceholder", "Filtrar propiedades...")}
                  value={searchProp}
                  onChange={(e) => setSearchProp(e.target.value)}
                />
                {propsPanelOpen && (
                  <div className="mt-2 max-h-56 overflow-auto border rounded p-1 bg-white">
                    {propsLoading ? (
                      <div className="space-y-2 p-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <PropItemSkeleton key={i} />
                        ))}
                      </div>
                    ) : filteredProps.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        {getText("properties.form.noResultsText", "Sin resultados")}
                      </div>
                    ) : (
                      filteredProps.map((p) => {
                        const has = tariffsByProperty.has(Number(p.id));
                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "p-2 rounded cursor-pointer hover:bg-muted/30 flex items-center justify-between",
                              selectedProperty?.id === p.id
                                ? "bg-muted/20 font-semibold"
                                : ""
                            )}
                            onClick={() => handleChooseProperty(p)}
                          >
                            <div>
                              <div className="text-sm">{p.address}</div>
                              <div className="text-xs text-muted-foreground">
                                #{p.id}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {has ? getText("guards.tariffs.flag", "⚑ Tarifa") : "—"}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Columna derecha: Propiedad seleccionada + tarifa */}
              <div className="w-full md:w-1/2">
                <Label className="text-sm">{getText("guards.tariffs.selectedPropertyLabel", "Propiedad seleccionada")}</Label>
                <div className="p-3 rounded border bg-muted/5 mb-3">
                  {propsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-2/3 rounded" />
                      <Skeleton className="h-4 w-1/3 rounded" />
                    </div>
                  ) : selectedProperty ? (
                    <>
                      <div className="font-medium">
                        {selectedProperty.address}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        #{selectedProperty.id}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {getText("guards.tariffs.noneSelected", "Ninguna propiedad seleccionada")}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-sm">{getText("guards.tariffs.rateLabel", "Tarifa por hora")}</Label>
                    <Input
                      ref={rateInputRef}
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder={getText("guards.tariffs.ratePlaceholder", "Ej: 15.00")}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm mb-1">{getText("guards.tariffs.activeLabel", "Activo")}</Label>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => setIsActive(Boolean(v))}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  {!propsPanelOpen && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPropsPanelOpen(true)}
                      disabled={saving}
                    >
                      {getText("guards.tariffs.changeProperty", "Cambiar propiedad")}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => resetForm()} disabled={saving}>
                    {getText("actions.reset", "Reset")}
                  </Button>

                  {/* durante saving mostramos skeletons en vez del botón activo */}
                  {saving ? (
                    <Skeleton className="h-10 w-36 rounded" />
                  ) : (
                    <Button
                      onClick={handleSave}
                      disabled={saving || !selectedProperty}
                    >
                      {editingTariff
                        ? getText("guards.tariffs.update", "Actualizar tarifa")
                        : getText("guards.tariffs.create", "Crear tarifa")}
                    </Button>
                  )}
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  {getText("guards.tariffs.note", "Nota: si la propiedad ya tiene tarifa, al seleccionarla pasarás a editarla; si no, crearás una nueva.")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-end w-full">
            <Button variant="destructive" onClick={() => onClose()}>
              {getText("actions.close", "Cerrar")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
