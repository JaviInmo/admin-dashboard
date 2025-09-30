// src/components/Notes/Edit/EditNote.tsx
"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { toast } from "sonner";
import type { Note, UpdateNotePayload } from "../type";
import { updateNote } from "../../../lib/services/notes";
import { useI18n } from "../../../i18n";

import GuardSelect from "../Selects/GuardSelect";
import PropertySelect from "../Selects/PropertySelect";
import ServiceSelect from "../Selects/ServiceSelect";
import ShiftSelect from "../Selects/ShiftSelect";
import WeaponSelect from "../Selects/WeaponSelect";
import PropertyTypeSelect from "../Selects/PropertyTypeSelect";
import UserSelect from "../Selects/UserSelect";

/* getters */
import { getGuard } from "@/lib/services/guard";
import { getService } from "@/lib/services/services";
import { getUser } from "@/lib/services/users";
import { getProperty, getPropertyTypeOfService } from "@/lib/services/properties";
import { getShift } from "@/lib/services/shifts";
import { getWeapon } from "@/lib/services/weapons";

/* types */
import type { Guard } from "@/components/Guards/types";
import type { Service } from "@/components/Services/types";
import type { Shift } from "@/components/Shifts/types";
import type { Weapon } from "@/components/Weapons/types";
import type { AppUser } from "@/lib/services/users";
import type { AppProperty, AppPropertyType } from "@/lib/services/properties";

/* ---------------- helper ---------------- */
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

/* Form state typing */
type FormState = {
  amounts: Array<string | number | null>;
  clients: Array<number | null>;
  properties: Array<number | null>;
  guards: Array<number | null>;
  services: Array<number | null>;
  shifts: Array<number | null>;
  weapons: Array<number | null>;
  type_of_services: Array<number | null>;
};

type ArrayKeys = keyof FormState;

type FieldType =
  | "amount"
  | "client"
  | "guard"
  | "property"
  | "service"
  | "shift"
  | "weapon"
  | "property_type";

/* ---------------- component ---------------- */
interface Props {
  note: Note;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

export default function EditNoteDialog({ note, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();

  // Basic fields
  const [name, setName] = React.useState<string>(note?.name ?? "");
  const [description, setDescription] = React.useState<string | null>(note?.description ?? null);

  // Form internal structure (arrays)
  const [form, setForm] = React.useState<FormState>({
    amounts: [],
    clients: [],
    properties: [],
    guards: [],
    services: [],
    shifts: [],
    weapons: [],
    type_of_services: [],
  });

  // Selected object arrays for selects (full objects)
  const [selectedUsers, setSelectedUsers] = React.useState<Array<AppUser | null>>([]);
  const [selectedGuards, setSelectedGuards] = React.useState<Array<Guard | null>>([]);
  const [selectedProperties, setSelectedProperties] = React.useState<Array<AppProperty | null>>([]);
  const [selectedServices, setSelectedServices] = React.useState<Array<Service | null>>([]);
  const [selectedShifts, setSelectedShifts] = React.useState<Array<Shift | null>>([]);
  const [selectedWeapons, setSelectedWeapons] = React.useState<Array<Weapon | null>>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = React.useState<Array<AppPropertyType | null>>([]);

  // central chooser
  const [fieldToAdd, setFieldToAdd] = React.useState<FieldType | "">("");

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorsMap, setErrorsMap] = React.useState<Record<string, string>>({});

  // Init state from note (ids arrays)
  React.useEffect(() => {
    setName(note?.name ?? "");
    setDescription(note?.description ?? null);

    const initialAmounts: Array<string | number | null> =
      note && note.amount !== null && note.amount !== undefined ? [String(note.amount)] : [];

    const clientsArr: Array<number | null> = Array.isArray(note.clients) ? [...note.clients] : [];
    const propertiesArr: Array<number | null> = Array.isArray(note.properties) ? [...note.properties] : [];
    const guardsArr: Array<number | null> = Array.isArray(note.guards) ? [...note.guards] : [];
    const servicesArr: Array<number | null> = Array.isArray(note.services) ? [...note.services] : [];
    const shiftsArr: Array<number | null> = Array.isArray(note.shifts) ? [...note.shifts] : [];
    const weaponsArr: Array<number | null> = Array.isArray(note.weapons) ? [...note.weapons] : [];
    const typesArr: Array<number | null> = Array.isArray(note.type_of_services) ? [...note.type_of_services] : [];

    setForm({
      amounts: initialAmounts,
      clients: clientsArr,
      properties: propertiesArr,
      guards: guardsArr,
      services: servicesArr,
      shifts: shiftsArr,
      weapons: weaponsArr,
      type_of_services: typesArr,
    });

    // placeholders; then we'll fetch the full objects
    setSelectedUsers(clientsArr.map(() => null));
    setSelectedProperties(propertiesArr.map(() => null));
    setSelectedGuards(guardsArr.map(() => null));
    setSelectedServices(servicesArr.map(() => null));
    setSelectedShifts(shiftsArr.map(() => null));
    setSelectedWeapons(weaponsArr.map(() => null));
    setSelectedPropertyTypes(typesArr.map(() => null));

    setError(null);
    setErrorsMap({});
    setFieldToAdd("");
  }, [note, open]);

  // Fetch full objects (so selects show labels) when modal opens
  React.useEffect(() => {
    let mounted = true;
    async function loadRelatedObjects() {
      if (!note) return;
      setLoading(true);
      try {
        // GUARDS
        if (Array.isArray(note.guards) && note.guards.length > 0) {
          const guardPromises = note.guards.map(async (id: number) => {
            try {
              const g = (await getGuard(Number(id))) as Guard | null;
              return g ?? null;
            } catch (e) {
              console.warn("getGuard failed for id", id, e);
              return null;
            }
          });
          const guards = await Promise.all(guardPromises);
          if (!mounted) return;
          setSelectedGuards(guards);
        } else {
          setSelectedGuards([]);
        }

        // USERS / CLIENTS
        if (Array.isArray(note.clients) && note.clients.length > 0) {
          const userPromises = note.clients.map(async (id: number) => {
            try {
              const u = (await getUser(Number(id))) as AppUser | null;
              return u ?? null;
            } catch (e) {
              console.warn("getUser failed for id", id, e);
              return null;
            }
          });
          const users = await Promise.all(userPromises);
          if (!mounted) return;
          setSelectedUsers(users);
        } else {
          setSelectedUsers([]);
        }

        // PROPERTIES
        if (Array.isArray(note.properties) && note.properties.length > 0) {
          const propPromises = note.properties.map(async (id: number) => {
            try {
              const p = (await getProperty(Number(id))) as AppProperty | null;
              return p ?? null;
            } catch (e) {
              console.warn("getProperty failed for id", id, e);
              return null;
            }
          });
          const props = await Promise.all(propPromises);
          if (!mounted) return;
          setSelectedProperties(props);
        } else {
          setSelectedProperties([]);
        }

        // SERVICES
        if (Array.isArray(note.services) && note.services.length > 0) {
          const svcPromises = note.services.map(async (id: number) => {
            try {
              const s = (await getService(Number(id))) as Service | null;
              return s ?? null;
            } catch (e) {
              console.warn("getService failed for id", id, e);
              return null;
            }
          });
          const svcs = await Promise.all(svcPromises);
          if (!mounted) return;
          setSelectedServices(svcs);
        } else {
          setSelectedServices([]);
        }

        // SHIFTS
        if (Array.isArray(note.shifts) && note.shifts.length > 0) {
          const shiftPromises = note.shifts.map(async (id: number) => {
            try {
              const s = (await getShift(Number(id))) as Shift | null;
              return s ?? null;
            } catch (e) {
              console.warn("getShift failed for id", id, e);
              return null;
            }
          });
          const sh = await Promise.all(shiftPromises);
          if (!mounted) return;
          setSelectedShifts(sh);
        } else {
          setSelectedShifts([]);
        }

        // WEAPONS
        if (Array.isArray(note.weapons) && note.weapons.length > 0) {
          const weaponPromises = note.weapons.map(async (id: number) => {
            try {
              const w = (await getWeapon(Number(id))) as Weapon | null;
              return w ?? null;
            } catch (e) {
              console.warn("getWeapon failed for id", id, e);
              return null;
            }
          });
          const ws = await Promise.all(weaponPromises);
          if (!mounted) return;
          setSelectedWeapons(ws);
        } else {
          setSelectedWeapons([]);
        }

        // TYPE OF SERVICES (PROPERTY TYPES)
        if (Array.isArray(note.type_of_services) && note.type_of_services.length > 0) {
          const typePromises = note.type_of_services.map(async (id: number) => {
            try {
              const t = (await getPropertyTypeOfService(Number(id))) as AppPropertyType | null;
              return t ?? null;
            } catch (e) {
              console.warn("getPropertyTypeOfService failed for id", id, e);
              return null;
            }
          });
          const types = await Promise.all(typePromises);
          if (!mounted) return;
          setSelectedPropertyTypes(types);
        } else {
          setSelectedPropertyTypes([]);
        }
      } catch (err) {
        console.error("loadRelatedObjects error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (open && note) loadRelatedObjects();

    return () => {
      mounted = false;
    };
     
  }, [note, open]);

  // helpers to mutate arrays in form (typed)
  const pushTo = <K extends ArrayKeys>(key: K, value: FormState[K][number]) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as unknown as Array<unknown>) : [];
      const next = [...current, value] as unknown as FormState[K];
      return { ...prev, [key]: next } as FormState;
    });
  };

  const removeAt = <K extends ArrayKeys>(key: K, idx: number) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as unknown as Array<unknown>) : [];
      const next = current.slice();
      next.splice(idx, 1);
      return { ...prev, [key]: next as unknown as FormState[K] } as FormState;
    });
  };

  const setAt = <K extends ArrayKeys>(key: K, idx: number, value: FormState[K][number]) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as unknown as Array<unknown>) : [];
      const next = current.slice();
      next[idx] = value;
      return { ...prev, [key]: next as unknown as FormState[K] } as FormState;
    });
  };

  // helpers for selected object arrays (typed)
  const pushSelected = <T,>(setter: React.Dispatch<React.SetStateAction<Array<T | null>>>, value: T | null) => {
    setter((prev) => [...prev, value]);
  };
  const removeSelectedAt = <T,>(setter: React.Dispatch<React.SetStateAction<Array<T | null>>>, idx: number) => {
    setter((prev) => {
      const copy = prev.slice();
      copy.splice(idx, 1);
      return copy;
    });
  };
  const setSelectedAt = <T,>(setter: React.Dispatch<React.SetStateAction<Array<T | null>>>, idx: number, value: T | null) => {
    setter((prev) => {
      const copy = prev.slice();
      copy[idx] = value;
      return copy;
    });
  };

  const handleAddField = (type: FieldType) => {
    switch (type) {
      case "amount":
        pushTo("amounts", "");
        break;
      case "client":
        pushTo("clients", null);
        pushSelected(setSelectedUsers, null);
        break;
      case "guard":
        pushTo("guards", null);
        pushSelected(setSelectedGuards, null);
        break;
      case "property":
        pushTo("properties", null);
        pushSelected(setSelectedProperties, null);
        break;
      case "service":
        pushTo("services", null);
        pushSelected(setSelectedServices, null);
        break;
      case "shift":
        pushTo("shifts", null);
        pushSelected(setSelectedShifts, null);
        break;
      case "weapon":
        pushTo("weapons", null);
        pushSelected(setSelectedWeapons, null);
        break;
      case "property_type":
        pushTo("type_of_services", null);
        pushSelected(setSelectedPropertyTypes, null);
        break;
      default:
        break;
    }
    setFieldToAdd("");
  };

  // normalize amounts to numbers then reduce (no anys)
  const computeAmountsTotal = (): number => {
    const arr: Array<string | number | null> = Array.isArray(form.amounts) ? form.amounts : [];
    const nums: number[] = arr.map((v) => {
      const s = v === null || v === undefined ? "" : String(v).trim().replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    });
    return nums.reduce((a, b) => a + b, 0);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name || !name.trim()) {
      newErrors.name = getTextFromObject(TEXT, "notes.create.validation.nameRequired", "Name is required");
    }
    (form.amounts || []).forEach((a, idx) => {
      if (a !== null && a !== undefined && String(a).trim() !== "") {
        const normalized = String(a).replace(",", ".");
        if (Number.isNaN(Number(normalized))) {
          newErrors[`amounts.${idx}`] = getTextFromObject(
            TEXT,
            "notes.create.validation.amountInvalid",
            "Amount must be a valid number",
          );
        }
      }
    });
    setErrorsMap(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setError(getTextFromObject(TEXT, "common.loading", "Please fix the errors above"));
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: UpdateNotePayload = {};

      payload.name = name.trim();
      payload.description = description === "" ? null : description ?? null;

      if (Array.isArray(form.amounts) && form.amounts.length > 0) {
        payload.amount = computeAmountsTotal();
      }

      const pushIfAny = (key: ArrayKeys, outKey?: keyof UpdateNotePayload) => {
        const arr = Array.isArray(form[key]) ? (form[key] as Array<number | null>).filter((x) => x != null) : [];
        if (arr.length > 0) {
          const finalKey = outKey ?? (key as unknown as keyof UpdateNotePayload);
          // @ts-expect-error dynamic assignment
          payload[finalKey] = arr.map((x) => Number(x));
        }
      };

      pushIfAny("clients", "clients");
      pushIfAny("properties", "properties");
      pushIfAny("guards", "guards");
      pushIfAny("services", "services");
      pushIfAny("shifts", "shifts");
      pushIfAny("weapons", "weapons");
      pushIfAny("type_of_services", "type_of_services");

      await updateNote(note.id, payload);

      toast.success(getTextFromObject(TEXT, "notes.messages.updated", "Note updated"));
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err) {
       
      console.error("Error updating note:", err);
      const message = typeof err === "object" ? JSON.stringify(err) : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isMissingNote = !note || Object.keys(note).length === 0;

  // UI text
  const saveText = getTextFromObject(TEXT, "actions.save", "Save");
  const savingText = getTextFromObject(TEXT, "actions.saving", "Saving...");
  const cancelText = getTextFromObject(TEXT, "actions.cancel", "Cancel");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl  ">
        <DialogHeader>
          <DialogTitle className="">{getTextFromObject(TEXT, "actions.edit", "Edit")} — #{note?.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3  ">
          {isMissingNote ? (
            <p>{getTextFromObject(TEXT, "table.noData", "Note data unavailable")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name & Description */}
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.name", "Name")} *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
                {errorsMap.name && <p className="text-sm text-red-600 mt-1">{errorsMap.name}</p>}
              </div>

              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.description", "Description")}</Label>
                <Input value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* central add-field chooser */}
              <div className="flex items-center gap-2 ">
                <Label className="pr-2">+</Label>
                <select
                  aria-label="Add field"
                  className="border rounded px-2 py-1"
                  value={fieldToAdd}
                  onChange={(e) => setFieldToAdd(e.target.value as FieldType | "")}
                >
                  <option value="">— Add field —</option>
                  <option value="amount">Amount</option>
                  <option value="client">User / Client</option>
                  <option value="guard">Guard</option>
                  <option value="property">Property</option>
                  <option value="service">Service</option>
                  <option value="shift">Shift</option>
                  <option value="weapon">Weapon</option>
                  <option value="property_type">Property Type of Service</option>
                </select>
                <Button
                  onClick={() => {
                    if (fieldToAdd) handleAddField(fieldToAdd as FieldType);
                  }}
                  disabled={!fieldToAdd}
                >
                  Add
                </Button>
              </div>

              <div className="max-h-72 overflow-auto ">
                {/* AMOUNTS */}
                {Array.isArray(form.amounts) && form.amounts.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.amounts", "Amounts")}</Label>
                    <div className="space-y-2">
                      {form.amounts.map((val, idx) => (
                        <div key={`amt-${idx}`} className="flex items-center gap-2">
                          <Input
                            value={val ?? ""}
                            onChange={(e) => setAt("amounts", idx, e.target.value)}
                            placeholder={getTextFromObject(TEXT, "notes.create.amountPlaceholder", "e.g. 100.50 or -15")}
                            inputMode="decimal"
                            className={errorsMap[`amounts.${idx}`] ? "border-red-500" : ""}
                          />
                          <div className="flex gap-1">
                            <button type="button" className="px-2 py-1 border rounded" onClick={() => removeAt("amounts", idx)}>
                              −
                            </button>
                            <button type="button" className="px-2 py-1 border rounded" onClick={() => pushTo("amounts", "")}>
                              +
                            </button>
                          </div>
                          {errorsMap[`amounts.${idx}`] && <p className="text-sm text-red-600 mt-1">{errorsMap[`amounts.${idx}`]}</p>}
                        </div>
                      ))}
                      <div className="pt-1">
                        <div className="text-sm">
                          <strong>{getTextFromObject(TEXT, "notes.create.totalLabel", "Total")}: </strong>
                          <span>{computeAmountsTotal()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CLIENTS */}
                {Array.isArray(form.clients) && form.clients.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.clients", "Clients")}</Label>
                    <div className="space-y-2">
                      {form.clients.map((id, idx) => {
                        void id;
                        return (
                          <div key={`client-${idx}`} className="flex items-center gap-2">
                            <div className="flex-1">
                              <UserSelect
                                id={`note_user_${idx}`}
                                value={selectedUsers[idx] ?? null}
                                onChange={(u) => {
                                  setSelectedAt(setSelectedUsers, idx, u ?? null);
                                  setAt("clients", idx, u?.id ?? null);
                                }}
                                placeholder="Buscar usuario..."
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  removeSelectedAt(setSelectedUsers, idx);
                                  removeAt("clients", idx);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  pushSelected(setSelectedUsers, null);
                                  pushTo("clients", null);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* GUARDS */}
                {Array.isArray(form.guards) && form.guards.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.guards", "Guards")}</Label>
                    <div className="space-y-2">
                      {form.guards.map((id, idx) => {
                        void id;
                        return (
                          <div key={`guard-${idx}`} className="flex items-center gap-2">
                            <div className="flex-1">
                              <GuardSelect
                                id={`note_guard_${idx}`}
                                value={selectedGuards[idx] ?? null}
                                onChange={(g) => {
                                  setSelectedAt(setSelectedGuards, idx, g ?? null);
                                  setAt("guards", idx, g?.id ?? null);
                                }}
                                placeholder="Buscar guard..."
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  removeSelectedAt(setSelectedGuards, idx);
                                  removeAt("guards", idx);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  pushSelected(setSelectedGuards, null);
                                  pushTo("guards", null);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PROPERTIES */}
                {Array.isArray(form.properties) && form.properties.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.properties", "Properties")}</Label>
                    <div className="space-y-2">
                      {form.properties.map((id, idx) => {
                        void id;
                        return (
                          <div key={`prop-${idx}`} className="flex items-center gap-2">
                            <div className="flex-1">
                              <PropertySelect
                                id={`note_property_${idx}`}
                                value={selectedProperties[idx] ?? null}
                                onChange={(p) => {
                                  setSelectedAt(setSelectedProperties, idx, p ?? null);
                                  setAt("properties", idx, p?.id ?? null);
                                }}
                                placeholder="Buscar propiedad..."
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  removeSelectedAt(setSelectedProperties, idx);
                                  removeAt("properties", idx);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  pushSelected(setSelectedProperties, null);
                                  pushTo("properties", null);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SERVICES */}
                {Array.isArray(form.services) && form.services.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.services", "Services")}</Label>
                    <div className="space-y-2">
                      {form.services.map((id, idx) => {
                        void id;
                        return (
                          <div key={`service-${idx}`} className="flex items-center gap-2">
                            <div className="flex-1">
                              <ServiceSelect
                                id={`note_service_${idx}`}
                                value={selectedServices[idx] ?? null}
                                onChange={(s) => {
                                  setSelectedAt(setSelectedServices, idx, s ?? null);
                                  setAt("services", idx, s?.id ?? null);
                                }}
                                placeholder="Buscar servicio..."
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  removeSelectedAt(setSelectedServices, idx);
                                  removeAt("services", idx);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  pushSelected(setSelectedServices, null);
                                  pushTo("services", null);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SHIFTS */}
                {Array.isArray(form.shifts) && form.shifts.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.shifts", "Shifts")}</Label>
                    <div className="space-y-2">
                      {form.shifts.map((id, idx) => {
                        void id;
                        return (
                          <div key={`shift-${idx}`} className="flex items-center gap-2">
                            <div className="flex-1">
                              <ShiftSelect
                                id={`note_shift_${idx}`}
                                value={selectedShifts[idx] ?? null}
                                onChange={(s) => {
                                  setSelectedAt(setSelectedShifts, idx, s ?? null);
                                  setAt("shifts", idx, s?.id ?? null);
                                }}
                                placeholder="Buscar shift..."
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  removeSelectedAt(setSelectedShifts, idx);
                                  removeAt("shifts", idx);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  pushSelected(setSelectedShifts, null);
                                  pushTo("shifts", null);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* WEAPONS */}
                {Array.isArray(form.weapons) && form.weapons.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.weapons", "Weapons")}</Label>
                    <div className="space-y-2">
                      {form.weapons.map((id, idx) => {
                        void id;
                        return (
                          <div key={`weapon-${idx}`} className="flex items-center gap-2">
                            <div className="flex-1">
                              <WeaponSelect
                                id={`note_weapon_${idx}`}
                                value={selectedWeapons[idx] ?? null}
                                onChange={(w) => {
                                  setSelectedAt(setSelectedWeapons, idx, w ?? null);
                                  setAt("weapons", idx, w?.id ?? null);
                                }}
                                placeholder="Buscar arma..."
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  removeSelectedAt(setSelectedWeapons, idx);
                                  removeAt("weapons", idx);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  pushSelected(setSelectedWeapons, null);
                                  pushTo("weapons", null);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PROPERTY TYPES */}
                {Array.isArray(form.type_of_services) && form.type_of_services.length > 0 && (
                  <div>
                    <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.type_of_services", "Type of Service")}</Label>
                    <div className="space-y-2">
                      {form.type_of_services.map((id, idx) => {
                        void id;
                        return (
                          <div key={`ptype-${idx}`} className="flex items-center gap-2">
                            <div className="flex-1">
                              <PropertyTypeSelect
                                id={`note_property_type_${idx}`}
                                value={selectedPropertyTypes[idx] ?? null}
                                onChange={(t) => {
                                  setSelectedAt(setSelectedPropertyTypes, idx, t ?? null);
                                  setAt("type_of_services", idx, t?.id ?? null);
                                }}
                                placeholder="Buscar tipo de servicio..."
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  removeSelectedAt(setSelectedPropertyTypes, idx);
                                  removeAt("type_of_services", idx);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 border rounded"
                                onClick={() => {
                                  pushSelected(setSelectedPropertyTypes, null);
                                  pushTo("type_of_services", null);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  {cancelText}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? savingText : saveText}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
