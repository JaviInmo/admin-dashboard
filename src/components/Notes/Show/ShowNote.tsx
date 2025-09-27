// src/components/Notes/Show/ShowNote.tsx
"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import type { Note } from "../type";
import { useI18n } from "../../../i18n";

/* getters: asegúrate que existen en tu proyecto */
import { getGuard } from "@/lib/services/guard";
import { getService } from "@/lib/services/services";
import { getUser } from "@/lib/services/users";
import { getProperty, getPropertyTypeOfService } from "@/lib/services/properties";
import { getShift } from "@/lib/services/shifts";
import { getWeapon } from "@/lib/services/weapons";

interface Props {
  note: Note | null;
  open: boolean;
  onClose: () => void;
}

function getTextFromObject(obj: unknown, path: string, fallback = ""): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (typeof cur === "object" && cur !== null && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return fallback;
    }
  }
  return typeof cur === "string" ? cur : fallback;
}

const guardLabel = (g?: any | null) =>
  g ? `${(g.firstName ?? "").trim()} ${(g.lastName ?? "").trim()}`.trim() || g.email || `#${g.id}` : "";

const userLabel = (u?: any | null) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || `#${u.id}` : "");

const propertyLabel = (p?: any | null) => (p ? p.name ?? p.alias ?? `#${p.id}` : "");
const serviceLabel = (s?: any | null) => (s ? s.name ?? `#${s.id}` : "");
const shiftLabel = (s?: any | null) => (s ? s.name ?? s.start_date ?? `#${s.id}` : "");
const weaponLabel = (w?: any | null) => (w ? w.name ?? `#${w.id}` : "");
const ptypeLabel = (t?: any | null) => (t ? t.name ?? `#${t.id}` : "");

// utilidades
const isPresent = (v: any) => v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");
const arrayHasPresent = (arr?: any[]) => Array.isArray(arr) && arr.filter((x) => x != null && !(typeof x === "string" && String(x).trim() === "")).length > 0;

export default function ShowNoteDialog({ note, open, onClose }: Props) {
  const { TEXT } = useI18n();

  // loaded related full objects (for display)
  const [guards, setGuards] = React.useState<(any | null)[]>([]);
  const [users, setUsers] = React.useState<(any | null)[]>([]);
  const [properties, setProperties] = React.useState<(any | null)[]>([]);
  const [services, setServices] = React.useState<(any | null)[]>([]);
  const [shifts, setShifts] = React.useState<(any | null)[]>([]);
  const [weapons, setWeapons] = React.useState<(any | null)[]>([]);
  const [propertyTypes, setPropertyTypes] = React.useState<(any | null)[]>([]);
  const [loadingRelated, setLoadingRelated] = React.useState(false);

  // When dialog opens, fetch related objects (if any)
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!note) return;
      setLoadingRelated(true);
      try {
        // helpers to map ids -> objects (return null on failure)
        const fetchAll = async (ids?: number[] | null, getter?: (id: number) => Promise<any>) => {
          if (!Array.isArray(ids) || ids.length === 0) return [];
          const promises = ids.map(async (id) => {
            try {
              return getter ? await getter(Number(id)) : null;
            } catch (e) {
              console.warn("fetch related failed for id", id, e);
              return null;
            }
          });
          return Promise.all(promises);
        };

        const noteGuards =
          Array.isArray((note as any).guards) && (note as any).guards.length > 0
            ? (note as any).guards
            : note && (note as any).guard
            ? [(note as any).guard]
            : [];
        const noteUsers =
          Array.isArray((note as any).clients) && (note as any).clients.length > 0
            ? (note as any).clients
            : note && (note as any).client
            ? [(note as any).client]
            : [];
        const noteProperties =
          Array.isArray((note as any).properties) && (note as any).properties.length > 0
            ? (note as any).properties
            : note && (note as any).property_obj
            ? [(note as any).property_obj]
            : [];
        const noteServices = Array.isArray((note as any).services) && (note as any).services.length > 0 ? (note as any).services : [];
        const noteShifts = Array.isArray((note as any).shifts) && (note as any).shifts.length > 0 ? (note as any).shifts : [];
        const noteWeapons = Array.isArray((note as any).weapons) && (note as any).weapons.length > 0 ? (note as any).weapons : [];
        const noteTypes =
          Array.isArray((note as any).type_of_services) && (note as any).type_of_services.length > 0 ? (note as any).type_of_services : [];

        const [
          guardsLoaded,
          usersLoaded,
          propertiesLoaded,
          servicesLoaded,
          shiftsLoaded,
          weaponsLoaded,
          typesLoaded,
        ] = await Promise.all([
          fetchAll(noteGuards, getGuard),
          fetchAll(noteUsers, getUser),
          fetchAll(noteProperties, getProperty),
          fetchAll(noteServices, getService),
          fetchAll(noteShifts, getShift),
          fetchAll(noteWeapons, getWeapon),
          fetchAll(noteTypes, getPropertyTypeOfService),
        ]);

        if (!mounted) return;
        setGuards(guardsLoaded);
        setUsers(usersLoaded);
        setProperties(propertiesLoaded);
        setServices(servicesLoaded);
        setShifts(shiftsLoaded);
        setWeapons(weaponsLoaded);
        setPropertyTypes(typesLoaded);
      } catch (err) {
        console.error("Error loading related note objects:", err);
      } finally {
        if (mounted) setLoadingRelated(false);
      }
    }

    if (open && note) load();
    return () => {
      mounted = false;
    };
  }, [note, open]);

  // helper to render list of labels for an array of objects (or ids fallback)
  const renderList = (objs: (any | null)[] | undefined, fallbackIds?: any[] | undefined, renderFn?: (x: any) => string) => {
    if (loadingRelated) return <p className="text-sm text-muted-foreground">Loading…</p>;

    const nonNullObjs = Array.isArray(objs) ? objs.filter((o) => o != null) : [];

    if (nonNullObjs.length > 0) {
      return (
        <ul className="space-y-1">
          {nonNullObjs.map((o, i) => (
            <li key={i} className="text-sm">
              {renderFn ? renderFn(o) : String(o)}
            </li>
          ))}
        </ul>
      );
    }

    // fallback: if there are ids and they are present, show ids
    if (Array.isArray(fallbackIds) && fallbackIds.length > 0) {
      const nonEmptyIds = fallbackIds.filter((id) => id != null && String(id).trim() !== "");
      if (nonEmptyIds.length > 0) {
        return (
          <ul className="space-y-1">
            {nonEmptyIds.map((id, i) => (
              <li key={i} className="text-sm">
                #{id}
              </li>
            ))}
          </ul>
        );
      }
    }

    return null; // nothing to render
  };

  // amounts: try amounts array, then note.amount, then amount_raw
  const amountsArray = Array.isArray((note as any)?.amounts) && (note as any).amounts.length > 0 ? (note as any).amounts : [];
  const amountTotal =
    amountsArray.length > 0
      ? amountsArray.reduce((acc: number, v: any) => {
          const s = v == null ? "" : String(v).trim().replace(",", ".");
          const n = Number(s);
          return acc + (Number.isFinite(n) ? n : 0);
        }, 0)
      : note && isPresent(note.amount)
      ? Number(note.amount)
      : undefined;

  // Decide which overall blocks to show
  const showAmountBlock = amountsArray.length > 0 || isPresent((note as any)?.amount) || isPresent((note as any)?.amount_raw);
  const showClientsBlock = arrayHasPresent(users) || arrayHasPresent((note as any)?.clients) || isPresent((note as any)?.client);
  const showGuardsBlock = arrayHasPresent(guards) || arrayHasPresent((note as any)?.guards) || isPresent((note as any)?.guard);
  const showPropertiesBlock = arrayHasPresent(properties) || arrayHasPresent((note as any)?.properties) || isPresent((note as any)?.property_obj);
  const showServicesBlock = arrayHasPresent(services) || arrayHasPresent((note as any)?.services);
  const showShiftsBlock = arrayHasPresent(shifts) || arrayHasPresent((note as any)?.shifts);
  const showWeaponsBlock = arrayHasPresent(weapons) || arrayHasPresent((note as any)?.weapons);
  const showTypesBlock = arrayHasPresent(propertyTypes) || arrayHasPresent((note as any)?.type_of_services);
  const showViewedBy = arrayHasPresent((note as any)?.viewed_by_ids);

  const showMetaCreated = isPresent((note as any)?.created_at);
  const showMetaUpdated = isPresent((note as any)?.updated_at);
  const showMetaActive = (note as any)?.is_active !== undefined && (note as any)?.is_active !== null;

  if (!note) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-2xl">
          <div className="p-4">
            <DialogHeader>
              <DialogTitle>{getTextFromObject(TEXT, "menu.notes", "Note")}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p>{getTextFromObject(TEXT, "table.noData", "No note selected.")}</p>
              <div className="flex justify-end mt-4">
                <Button onClick={onClose}>{getTextFromObject(TEXT, "actions.close", "Close")}</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        {/* Layout similar to EditNote: header fixed, name+description visible, rest scrollable, footer fixed */}
        <div className="flex max-h-[80vh] flex-col">
          <div className="px-4 pt-4">
            <DialogHeader>
              <DialogTitle className="pl-0">
                {getTextFromObject(TEXT, "menu.notes", "Note")}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="px-4 pt-2">
            {/* Name */}
            {isPresent(note.name) && (
              <div>
                <p className="text-sm">{getTextFromObject(TEXT, "services.fields.name", "Name")}</p>
                <p className="font-medium">{note.name}</p>
              </div>
            )}

            {/* Description */}
            {isPresent(note.description) && (
              <div className="mt-3">
                <p className="text-sm">{getTextFromObject(TEXT, "services.fields.description", "Description")}</p>
                <p className="whitespace-pre-wrap">{note.description}</p>
              </div>
            )}
          </div>

          {/* Scrollable body with the rest of fields */}
          <div className="px-4 py-3 overflow-y-auto flex-1">
            {/* Amounts / Amount */}
            {showAmountBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "services.fields.rate", "Amount")}</p>
                {amountsArray.length > 0 ? (
                  <>
                    <ul className="list-disc list-inside">
                      {amountsArray.map((a: any, i: number) =>
                        isPresent(a) ? (
                          <li key={i} className="text-sm">
                            {a}
                          </li>
                        ) : null
                      )}
                    </ul>
                    <div className="text-sm mt-1">
                      <strong>Total: </strong>
                      {Number.isFinite(amountTotal as number) ? String(amountTotal) : "-"}
                    </div>
                  </>
                ) : isPresent((note as any).amount) ? (
                  <p className="text-sm">{String((note as any).amount)}</p>
                ) : isPresent((note as any).amount_raw) ? (
                  <p className="text-sm">{String((note as any).amount_raw)}</p>
                ) : null}
              </div>
            )}

            {/* Clients / Users */}
            {showClientsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.clients", "Clients")}</p>
                {renderList(users, Array.isArray((note as any)?.clients) ? (note as any).clients : isPresent((note as any)?.client) ? [(note as any).client] : [], userLabel)}
              </div>
            )}

            {/* Guards */}
            {showGuardsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.guards", "Guards")}</p>
                {renderList(guards, Array.isArray((note as any)?.guards) ? (note as any).guards : isPresent((note as any)?.guard) ? [(note as any).guard] : [], guardLabel)}
              </div>
            )}

            {/* Properties */}
            {showPropertiesBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.properties", "Properties")}</p>
                {renderList(properties, Array.isArray((note as any)?.properties) ? (note as any).properties : isPresent((note as any)?.property_obj) ? [(note as any).property_obj] : [], propertyLabel)}
              </div>
            )}

            {/* Services */}
            {showServicesBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.services", "Services")}</p>
                {renderList(services, Array.isArray((note as any)?.services) ? (note as any).services : [], serviceLabel)}
              </div>
            )}

            {/* Shifts */}
            {showShiftsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.shifts", "Shifts")}</p>
                {renderList(shifts, Array.isArray((note as any)?.shifts) ? (note as any).shifts : [], shiftLabel)}
              </div>
            )}

            {/* Weapons */}
            {showWeaponsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.weapons", "Weapons")}</p>
                {renderList(weapons, Array.isArray((note as any)?.weapons) ? (note as any).weapons : [], weaponLabel)}
              </div>
            )}

            {/* Type of services / property types */}
            {showTypesBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.type_of_services", "Type of Service")}</p>
                {renderList(propertyTypes, Array.isArray((note as any)?.type_of_services) ? (note as any).type_of_services : [], ptypeLabel)}
              </div>
            )}

            {/* Viewed by (ids) */}
            {showViewedBy && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.fields.viewed_by", "Viewed by")}</p>
                <ul className="space-y-1">
                  {(note as any).viewed_by_ids
                    .filter((id: any) => id != null && String(id).trim() !== "")
                    .map((id: any, i: number) => (
                      <li key={i} className="text-sm">
                        #{id}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Meta: created/updated/is_active (sin mostrar el ID) */}
            {(showMetaCreated || showMetaUpdated || showMetaActive) && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {showMetaCreated && (
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p>{note?.created_at}</p>
                  </div>
                )}
                {showMetaUpdated && (
                  <div>
                    <p className="text-xs text-muted-foreground">Updated</p>
                    <p>{note?.updated_at}</p>
                  </div>
                )}
                {showMetaActive && (
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p>{(note as any).is_active ? "Yes" : "No"}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer fixed */}
          <div className="px-4 py-3 border-t">
            <div className="flex justify-end gap-2">
              <Button onClick={onClose}>{getTextFromObject(TEXT, "actions.close", "Close")}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
