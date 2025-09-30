// src/components/Notes/Show/ShowNote.tsx
"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import type { Note } from "../type";
import { useI18n } from "../../../i18n";

/* getters */
import { getGuard } from "@/lib/services/guard";
import { getService } from "@/lib/services/services";
import { getUser } from "@/lib/services/users";
import { getProperty, getPropertyTypeOfService } from "@/lib/services/properties";
import { getShift } from "@/lib/services/shifts";
import { getWeapon } from "@/lib/services/weapons";

/* tipos */
import type { Guard } from "../../Guards/types";
import type { Client } from "../../Clients/types";
import type { Service } from "../../Services/types";
import type { ServiceDetails } from "../../Shifts/types"; // fix según tu comentario
import type { Shift } from "../../Shifts/types";
import type { Weapon } from "../../Weapons/types";
import type { User } from "../../Users/types";
import type { AppProperty } from "../../../lib/services/properties"; // fix según tu comentario

// Si no tienes un tipo exportado para "property type of service", lo definimos mínimo aquí:
interface PropertyType {
  id?: number;
  name?: string | null;
}

/**
 * Nota: tu type Note original no incluía algunos campos que el componente maneja
 * (p.ej. `amounts`, `guard` single, `is_active`). Para evitar "Property does not exist"
 * definimos una extensión local que añade esos campos opcionales.
 */
type NoteWithExtras = Note & {
  guard?: number | null;
  amounts?: Array<number | string> | null;
  is_active?: boolean | null;
  // legacy single fields ya están parcialmente en Note (client, property_obj)
};

interface Props {
  note: NoteWithExtras | null;
  open: boolean;
  onClose: () => void;
}

/* helpers de texto */
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

/* Labels tipados y sin any */
const guardLabel = (g?: Guard | null): string =>
  g ? `${(g.firstName ?? "").trim()} ${(g.lastName ?? "").trim()}`.trim() || g.email || `#${g.id}` : "";

const userLabel = (u?: User | Client | null): string => {
  if (!u) return "";
  const firstLast = `${(u.firstName ?? "").trim()} ${(u.lastName ?? "").trim()}`.trim();
  if (firstLast) return firstLast;
  if ("username" in u && typeof u.username === "string" && u.username.trim()) return u.username;
  if ("email" in u && typeof u.email === "string" && u.email.trim()) return u.email;
  const id = (u as { id?: number }).id;
  return id !== undefined ? `#${id}` : "";
};

const propertyLabel = (p?: AppProperty | { id?: number; name?: string; alias?: string } | null): string => {
  if (!p) return "";
  if ("name" in p && typeof p.name === "string" && p.name.trim()) return p.name;
  if ("alias" in p && typeof p.alias === "string" && p.alias.trim()) return p.alias;
  const id = (p as { id?: number }).id;
  return id !== undefined ? `#${id}` : "";
};

const serviceLabel = (s?: Service | ServiceDetails | null): string => {
  if (!s) return "";
  if ("name" in s && typeof s.name === "string" && s.name.trim()) return s.name;
  const id = (s as { id?: number }).id;
  return id !== undefined ? `#${id}` : "";
};

const shiftLabel = (s?: Shift | null): string => {
  if (!s) return "";
  // Shift no tiene `name` según tus tipos; preferimos campos existentes
  if (s.propertyName && typeof s.propertyName === "string" && s.propertyName.trim()) return s.propertyName;
  if (s.guardName && typeof s.guardName === "string" && s.guardName.trim()) return s.guardName;
  if (s.plannedStartTime && typeof s.plannedStartTime === "string" && s.plannedStartTime.trim()) return s.plannedStartTime;
  return s.id !== undefined ? `#${s.id}` : "";
};

const weaponLabel = (w?: Weapon | null): string => {
  if (!w) return "";
  if (w.model && w.model.trim()) return w.model;
  if (w.serialNumber && w.serialNumber.trim()) return w.serialNumber;
  return w.id !== undefined ? `#${w.id}` : "";
};

const ptypeLabel = (t?: PropertyType | null): string => (t ? t.name ?? `#${t.id ?? ""}` : "");

/* utilidades */
const isPresent = (v: unknown) => v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");
const arrayHasPresent = (arr?: Array<unknown>) =>
  Array.isArray(arr) && arr.filter((x) => x != null && !(typeof x === "string" && String(x).trim() === "")).length > 0;

export default function ShowNoteDialog({ note, open, onClose }: Props) {
  const { TEXT } = useI18n();

  // loaded related full objects (for display)
  const [guards, setGuards] = React.useState<Array<Guard | null>>([]);
  const [users, setUsers] = React.useState<Array<User | Client | null>>([]);
  const [properties, setProperties] = React.useState<Array<AppProperty | null>>([]);
  const [services, setServices] = React.useState<Array<Service | ServiceDetails | null>>([]);
  const [shifts, setShifts] = React.useState<Array<Shift | null>>([]);
  const [weapons, setWeapons] = React.useState<Array<Weapon | null>>([]);
  const [propertyTypes, setPropertyTypes] = React.useState<Array<PropertyType | null>>([]);
  const [loadingRelated, setLoadingRelated] = React.useState(false);

  // When dialog opens, fetch related objects (if any)
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!note) return;
      setLoadingRelated(true);
      try {
        // helpers to map ids -> objects (return null on failure)
        const fetchAll = async <T,>(ids?: number[] | null, getter?: (id: number) => Promise<T>): Promise<Array<T | null>> => {
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

        // canonicalize arrays: si hay array lo usamos, si hay campo legacy single lo convertimos a array, si no => []
        const noteGuards: number[] =
          Array.isArray(note?.guards) && note.guards.length > 0 ? (note.guards as number[]) : note?.guard ? [note.guard as number] : [];

        const noteUsers: number[] =
          Array.isArray(note?.clients) && note.clients.length > 0 ? (note.clients as number[]) : note?.client ? [note.client as number] : [];

        const noteProperties: number[] =
          Array.isArray(note?.properties) && note.properties.length > 0 ? (note.properties as number[]) : note?.property_obj ? [note.property_obj as number] : [];

        const noteServices: number[] = Array.isArray(note?.services) && note.services.length > 0 ? (note.services as number[]) : [];
        const noteShifts: number[] = Array.isArray(note?.shifts) && note.shifts.length > 0 ? (note.shifts as number[]) : [];
        const noteWeapons: number[] = Array.isArray(note?.weapons) && note.weapons.length > 0 ? (note.weapons as number[]) : [];
        const noteTypes: number[] = Array.isArray(note?.type_of_services) && note.type_of_services.length > 0 ? (note.type_of_services as number[]) : [];

        const [
          guardsLoaded,
          usersLoaded,
          propertiesLoaded,
          servicesLoaded,
          shiftsLoaded,
          weaponsLoaded,
          typesLoaded,
        ] = await Promise.all([
          fetchAll<Guard>(noteGuards, getGuard),
          fetchAll<User | Client>(noteUsers, getUser),
          fetchAll<AppProperty>(noteProperties, getProperty),
          fetchAll<Service | ServiceDetails>(noteServices, getService),
          fetchAll<Shift>(noteShifts, getShift),
          fetchAll<Weapon>(noteWeapons, getWeapon),
          fetchAll<PropertyType>(noteTypes, getPropertyTypeOfService),
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
  const renderList = <T,>(objs?: Array<T | null>, fallbackIds?: number[] | undefined, renderFn?: (x: T) => string) => {
    if (loadingRelated) return <p className="text-sm text-muted-foreground">Loading…</p>;

    const nonNullObjs = Array.isArray(objs) ? (objs.filter((o) => o != null) as T[]) : [];

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
  const amountsArray: Array<number | string> =
    Array.isArray(note?.amounts) && (note?.amounts ?? []).length > 0 ? (note!.amounts as Array<number | string>) : [];

  const amountTotal: number | undefined =
    amountsArray.length > 0
      ? amountsArray.reduce((acc: number, v: number | string) => {
          const s = v == null ? "" : String(v).trim().replace(",", ".");
          const n = Number(s);
          return acc + (Number.isFinite(n) ? n : 0);
        }, 0)
      : note && isPresent(note.amount)
      ? Number(note.amount)
      : undefined;

  // Decide which overall blocks to show
  const showAmountBlock = amountsArray.length > 0 || isPresent(note?.amount) || isPresent((note as NoteWithExtras)?.amount_raw);
  const showClientsBlock = arrayHasPresent(users) || arrayHasPresent(note?.clients) || isPresent(note?.client);
  const showGuardsBlock = arrayHasPresent(guards) || arrayHasPresent(note?.guards) || isPresent(note?.guard);
  const showPropertiesBlock = arrayHasPresent(properties) || arrayHasPresent(note?.properties) || isPresent(note?.property_obj);
  const showServicesBlock = arrayHasPresent(services) || arrayHasPresent(note?.services);
  const showShiftsBlock = arrayHasPresent(shifts) || arrayHasPresent(note?.shifts);
  const showWeaponsBlock = arrayHasPresent(weapons) || arrayHasPresent(note?.weapons);
  const showTypesBlock = arrayHasPresent(propertyTypes) || arrayHasPresent(note?.type_of_services);
  const showViewedBy = arrayHasPresent(note?.viewed_by_ids);

  const showMetaCreated = isPresent(note?.created_at);
  const showMetaUpdated = isPresent(note?.updated_at);
  const showMetaActive = (note as NoteWithExtras)?.is_active !== undefined && (note as NoteWithExtras)?.is_active !== null;

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
              <DialogTitle className="pl-0">{getTextFromObject(TEXT, "menu.notes", "Note")}</DialogTitle>
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
                      {amountsArray.map((a: number | string, i: number) =>
                        isPresent(a) ? (
                          <li key={i} className="text-sm">
                            {String(a)}
                          </li>
                        ) : null
                      )}
                    </ul>
                    <div className="text-sm mt-1">
                      <strong>Total: </strong>
                      {typeof amountTotal === "number" && Number.isFinite(amountTotal) ? String(amountTotal) : "-"}
                    </div>
                  </>
                ) : isPresent(note.amount) ? (
                  <p className="text-sm">{String(note.amount)}</p>
                ) : isPresent((note as NoteWithExtras).amount_raw) ? (
                  <p className="text-sm">{String((note as NoteWithExtras).amount_raw)}</p>
                ) : null}
              </div>
            )}

            {/* Clients / Users */}
            {showClientsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.clients", "Clients")}</p>
                {renderList<User | Client>(
                  users,
                  Array.isArray(note.clients) ? note.clients : isPresent(note.client) ? [note.client as number] : [],
                  (u) => userLabel(u)
                )}
              </div>
            )}

            {/* Guards */}
            {showGuardsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.guards", "Guards")}</p>
                {renderList<Guard>(
                  guards,
                  Array.isArray(note.guards) ? note.guards : isPresent(note.guard) ? [note.guard as number] : [],
                  (g) => guardLabel(g)
                )}
              </div>
            )}

            {/* Properties */}
            {showPropertiesBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.properties", "Properties")}</p>
                {renderList<AppProperty>(
                  properties,
                  Array.isArray(note.properties) ? note.properties : isPresent(note.property_obj) ? [note.property_obj as number] : [],
                  (p) => propertyLabel(p)
                )}
              </div>
            )}

            {/* Services */}
            {showServicesBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.services", "Services")}</p>
                {renderList<Service | ServiceDetails>(services, Array.isArray(note.services) ? note.services : [], (s) => serviceLabel(s))}
              </div>
            )}

            {/* Shifts */}
            {showShiftsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.shifts", "Shifts")}</p>
                {renderList<Shift>(shifts, Array.isArray(note.shifts) ? note.shifts : [], (s) => shiftLabel(s))}
              </div>
            )}

            {/* Weapons */}
            {showWeaponsBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.weapons", "Weapons")}</p>
                {renderList<Weapon>(weapons, Array.isArray(note.weapons) ? note.weapons : [], (w) => weaponLabel(w))}
              </div>
            )}

            {/* Type of services / property types */}
            {showTypesBlock && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.create.fields.type_of_services", "Type of Service")}</p>
                {renderList<PropertyType>(propertyTypes, Array.isArray(note.type_of_services) ? note.type_of_services : [], (t) => ptypeLabel(t))}
              </div>
            )}

            {/* Viewed by (ids) */}
            {showViewedBy && (
              <div className="mb-4">
                <p className="text-sm">{getTextFromObject(TEXT, "notes.fields.viewed_by", "Viewed by")}</p>
                <ul className="space-y-1">
                  {note.viewed_by_ids
                    ?.filter((id: number) => id != null && String(id).trim() !== "")
                    .map((id: number, i: number) => (
                      <li key={i} className="text-sm">
                        #{id}
                      </li>
                    )) ?? null}
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
                    <p>{(note as NoteWithExtras).is_active ? "Yes" : "No"}</p>
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
