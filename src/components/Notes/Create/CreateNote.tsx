// src/components/Notes/Create/CreateNote.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { useI18n } from "../../../i18n";
import { createNote } from "../../../lib/services/notes";
import { showCreatedToast, showErrorToast } from "../../../lib/toast-helpers";

import GuardSelect from "../Selects/GuardSelect";
import PropertySelect from "../Selects/PropertySelect";
import ServiceSelect from "../Selects/ServiceSelect";
import ShiftSelect from "../Selects/ShiftSelect";
import WeaponSelect from "../Selects/WeaponSelect";
import PropertyTypeSelect from "../Selects/PropertyTypeSelect";
import UserSelect from "../Selects/UserSelect";

import type { CreateNotePayload } from "../type";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty, AppPropertyType } from "@/lib/services/properties";
import type { Service } from "@/components/Services/types";
import type { Shift } from "@/components/Shifts/types";
import type { Weapon } from "@/components/Weapons/types";
import type { AppUser } from "@/lib/services/users";

import { getGuard } from "@/lib/services/guard";
import { getProperty } from "@/lib/services/properties";
import { getUser } from "@/lib/services/users";

/* helper getTextFromObject */
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

type FormState = {
  name: string;
  description?: string;
  amount?: string | number | null;
  clients: Array<number | null>;
  properties: Array<number | null>;
  guards: Array<number | null>;
  services: Array<number | null>;
  shifts: Array<number | null>;
  weapons: Array<number | null>;
  type_of_services: Array<number | null>;
  amounts: Array<string | number | null>;
};

type ArrayKeys =
  | "clients"
  | "properties"
  | "guards"
  | "services"
  | "shifts"
  | "weapons"
  | "type_of_services"
  | "amounts";

type FieldType =
  | "amount"
  | "client"
  | "guard"
  | "property"
  | "service"
  | "shift"
  | "weapon"
  | "property_type";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
  /** Si se pasa, la nota nueva se inicializa con este guardia preseleccionado */
  initialGuardId?: number | null;
  /** Si se pasa, la nota nueva se inicializa con esta propiedad preseleccionada */
  initialPropertyId?: number | null;
  /** Si se pasa, la nota nueva se inicializa con este usuario/cliente preseleccionado */
  initialUserId?: number | null;
}

export default function CreateNote({ open, onClose, onCreated, initialGuardId, initialPropertyId, initialUserId }: Props) {
  const { TEXT } = useI18n();

  const [loading, setLoading] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    amount: "",
    clients: [],
    properties: [],
    guards: [],
    services: [],
    shifts: [],
    weapons: [],
    type_of_services: [],
    amounts: [],
  });

  // selected objects for UI (store full objects for selects)
  const [selectedUsers, setSelectedUsers] = useState<Array<AppUser | null>>([]);
  const [selectedGuards, setSelectedGuards] = useState<Array<Guard | null>>([]);
  const [selectedProperties, setSelectedProperties] = useState<Array<AppProperty | null>>([]);
  const [selectedServices, setSelectedServices] = useState<Array<Service | null>>([]);
  const [selectedShifts, setSelectedShifts] = useState<Array<Shift | null>>([]);
  const [selectedWeapons, setSelectedWeapons] = useState<Array<Weapon | null>>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<Array<AppPropertyType | null>>([]);

  const [fieldToAdd, setFieldToAdd] = useState<FieldType | "">("");

  // If an initial id is passed, when the modal opens we fetch and prefill
  useEffect(() => {
    let mounted = true;
    async function prefill() {
      if (!open) return;
      try {
        // Priority: initialPropertyId -> initialGuardId -> initialUserId
        if (initialPropertyId != null) {
          const p = await getProperty(Number(initialPropertyId));
          if (!mounted) return;
          setSelectedProperties([p ?? null]);
          setForm((prev) => ({ ...prev, properties: [p?.id ?? null] }));
          return;
        }
        if (initialGuardId != null) {
          const g = await getGuard(Number(initialGuardId));
          if (!mounted) return;
          setSelectedGuards([g ?? null]);
          setForm((prev) => ({ ...prev, guards: [g?.id ?? null] }));
          return;
        }
        if (initialUserId != null) {
          const u = await getUser(Number(initialUserId));
          if (!mounted) return;
          setSelectedUsers([u ?? null]);
          setForm((prev) => ({ ...prev, clients: [u?.id ?? null] }));
          return;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to prefill CreateNote:", err);
      }
    }
    prefill();
    return () => {
      mounted = false;
    };
  }, [open, initialGuardId, initialPropertyId, initialUserId]);

  useEffect(() => {
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      amount: "",
      clients: initialUserId ? [initialUserId] : [],
      properties: initialPropertyId ? [initialPropertyId] : [],
      guards: initialGuardId ? [initialGuardId] : [],
      services: [],
      shifts: [],
      weapons: [],
      type_of_services: [],
      amounts: [],
    });

    setSelectedUsers(initialUserId ? [null] : []);
    setSelectedGuards(initialGuardId ? [null] : []);
    setSelectedProperties(initialPropertyId ? [null] : []);
    setSelectedServices([]);
    setSelectedShifts([]);
    setSelectedWeapons([]);
    setSelectedPropertyTypes([]);

    setErrors({});
    setGeneralError(null);
    setLoading(false);
    setFieldToAdd("");
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name || !String(form.name).trim()) {
      newErrors.name = getTextFromObject(TEXT, "services.errors.nameRequired", "Name is required");
    }
    if (Array.isArray(form.amounts)) {
      for (let i = 0; i < form.amounts.length; i++) {
        const a = form.amounts[i];
        if (a !== null && a !== undefined && String(a).trim() !== "") {
          const normalized = String(a).replace(",", ".");
          if (Number.isNaN(Number(normalized))) {
            newErrors[`amounts.${i}`] = getTextFromObject(
              TEXT,
              "notes.create.validation.amountInvalid",
              "Amount must be a valid number",
            );
          }
        }
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setGeneralError(getTextFromObject(TEXT, "common.loading", "Please fix the errors above"));
      return false;
    }
    setGeneralError(null);
    return true;
  };

  // typed helpers
  const pushTo = <K extends ArrayKeys>(key: K, value: FormState[K] extends Array<infer U> ? U : never) => {
    setForm((prev) => {
      const current = (prev[key] ?? []) as unknown as Array<unknown>;
      return { ...(prev as object) as FormState, [key]: [...current, value] } as FormState;
    });
  };
  const removeAt = (key: ArrayKeys, idx: number) => {
    setForm((prev) => {
      const current = (prev[key] ?? []) as unknown as Array<unknown>;
      const next = current.slice();
      next.splice(idx, 1);
      return { ...(prev as object) as FormState, [key]: next } as FormState;
    });
  };
  const setAt = <K extends ArrayKeys>(key: K, idx: number, value: FormState[K] extends Array<infer U> ? U : never) => {
    setForm((prev) => {
      const current = (prev[key] ?? []) as unknown as Array<unknown>;
      const next = current.slice();
      next[idx] = value;
      return { ...(prev as object) as FormState, [key]: next } as FormState;
    });
  };

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
        pushSelected(setSelectedUsers, null);
        pushTo("clients", null);
        break;
      case "guard":
        pushSelected(setSelectedGuards, null);
        pushTo("guards", null);
        break;
      case "property":
        pushSelected(setSelectedProperties, null);
        pushTo("properties", null);
        break;
      case "service":
        pushSelected(setSelectedServices, null);
        pushTo("services", null);
        break;
      case "shift":
        pushSelected(setSelectedShifts, null);
        pushTo("shifts", null);
        break;
      case "weapon":
        pushSelected(setSelectedWeapons, null);
        pushTo("weapons", null);
        break;
      case "property_type":
        pushSelected(setSelectedPropertyTypes, null);
        pushTo("type_of_services", null);
        break;
      default:
        break;
    }
    setFieldToAdd("");
  };

  const computeAmountsTotal = (): number => {
    const arr: Array<string | number | null> = Array.isArray(form.amounts) ? form.amounts : [];
    const nums: number[] = arr.map((v) => {
      const s = v === null || v === undefined ? "" : String(v).trim().replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    });
    return nums.reduce((a, b) => a + b, 0);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Partial<CreateNotePayload> = {
        name: form.name,
      };

      if (form.description !== undefined && form.description !== null && form.description !== "") {
        payload.description = form.description;
      }

      if (Array.isArray(form.amounts) && form.amounts.length > 0) {
        const total = computeAmountsTotal();
        payload.amount = total;
      } else if (form.amount !== undefined && form.amount !== null && form.amount !== "") {
        payload.amount = form.amount;
      }

      if (Array.isArray(form.clients) && form.clients.filter((x) => x != null).length > 0) {
        payload.clients = form.clients.map((x) => (x == null ? null : Number(x))).filter((x) => x != null) as number[];
      }
      if (Array.isArray(form.properties) && form.properties.filter((x) => x != null).length > 0) {
        payload.properties = form.properties.map((x) => (x == null ? null : Number(x))).filter((x) => x != null) as number[];
      }
      if (Array.isArray(form.guards) && form.guards.filter((x) => x != null).length > 0) {
        payload.guards = form.guards.map((x) => (x == null ? null : Number(x))).filter((x) => x != null) as number[];
      }
      if (Array.isArray(form.services) && form.services.filter((x) => x != null).length > 0) {
        payload.services = form.services.map((x) => (x == null ? null : Number(x))).filter((x) => x != null) as number[];
      }
      if (Array.isArray(form.shifts) && form.shifts.filter((x) => x != null).length > 0) {
        payload.shifts = form.shifts.map((x) => (x == null ? null : Number(x))).filter((x) => x != null) as number[];
      }
      if (Array.isArray(form.weapons) && form.weapons.filter((x) => x != null).length > 0) {
        payload.weapons = form.weapons.map((x) => (x == null ? null : Number(x))).filter((x) => x != null) as number[];
      }
      if (Array.isArray(form.type_of_services) && form.type_of_services.filter((x) => x != null).length > 0) {
        payload.type_of_services = form.type_of_services.map((x) => (x == null ? null : Number(x))).filter((x) => x != null) as number[];
      }

      await createNote(payload as CreateNotePayload);
      showCreatedToast(getTextFromObject(TEXT, "notes.create.messages.created", "Note created"));

      if (onCreated) {
        await onCreated();
      }

      resetForm();
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error creating note:", err);
      showErrorToast(getTextFromObject(TEXT, "actions.create", "Failed to create note"));
      setGeneralError(getTextFromObject(TEXT, "actions.create", "Failed to create note. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const createText = getTextFromObject(TEXT, "actions.create", "Create");
  const cancelText = getTextFromObject(TEXT, "actions.cancel", "Cancel");
  const savingText = getTextFromObject(TEXT, "actions.saving", "Creating...");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl ">
        <DialogHeader>
          <DialogTitle>{getTextFromObject(TEXT, "notes.create.title", "Create Note")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* NAME */}
          <div>
            <Label className="pb-2" htmlFor="note_name">
              {getTextFromObject(TEXT, "notes.create.fields.name", "Name")} *
            </Label>
            <Input
              id="note_name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={getTextFromObject(TEXT, "services.placeholders.name", "Note name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* DESCRIPTION */}
          <div>
            <Label className="pb-2" htmlFor="note_description">
              {getTextFromObject(TEXT, "notes.create.fields.description", "Description")}
            </Label>
            <Input
              id="note_description"
              value={form.description ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={getTextFromObject(TEXT, "services.placeholders.description", "Description (optional)")}
            />
          </div>

          {/* Central add-field selector */}
          <div className="flex items-center gap-2">
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
                        className={errors[`amounts.${idx}`] ? "border-red-500" : ""}
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="px-2 py-1 border rounded"
                          onClick={() => removeAt("amounts", idx)}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 border rounded"
                          onClick={() => pushTo("amounts", "")}
                        >
                          +
                        </button>
                      </div>
                      {errors[`amounts.${idx}`] && (
                        <p className="text-sm text-red-600 mt-1">{errors[`amounts.${idx}`]}</p>
                      )}
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

            {/* CLIENTS / USERS */}
            {selectedUsers.length > 0 && (
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.clients", "Clients")}</Label>
                <div className="space-y-2">
                  {selectedUsers.map((sel, idx) => (
                    <div key={`client-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1">
                        <UserSelect
                          id={`note_user_${idx}`}
                          value={sel}
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
                  ))}
                </div>
              </div>
            )}

            {/* GUARDS */}
            {selectedGuards.length > 0 && (
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.guards", "Guards")}</Label>
                <div className="space-y-2">
                  {selectedGuards.map((sel, idx) => (
                    <div key={`guard-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1">
                        <GuardSelect
                          id={`note_guard_${idx}`}
                          value={sel}
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
                  ))}
                </div>
              </div>
            )}

            {/* PROPERTIES */}
            {selectedProperties.length > 0 && (
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.properties", "Properties")}</Label>
                <div className="space-y-2">
                  {selectedProperties.map((sel, idx) => (
                    <div key={`prop-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1">
                        <PropertySelect
                          id={`note_property_${idx}`}
                          value={sel}
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
                  ))}
                </div>
              </div>
            )}

            {/* SERVICES */}
            {selectedServices.length > 0 && (
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.services", "Services")}</Label>
                <div className="space-y-2">
                  {selectedServices.map((sel, idx) => (
                    <div key={`service-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1">
                        <ServiceSelect
                          id={`note_service_${idx}`}
                          value={sel}
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
                  ))}
                </div>
              </div>
            )}

            {/* SHIFTS */}
            {selectedShifts.length > 0 && (
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.shifts", "Shifts")}</Label>
                <div className="space-y-2">
                  {selectedShifts.map((sel, idx) => (
                    <div key={`shift-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1">
                        <ShiftSelect
                          id={`note_shift_${idx}`}
                          value={sel}
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
                  ))}
                </div>
              </div>
            )}

            {/* WEAPONS */}
            {selectedWeapons.length > 0 && (
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.weapons", "Weapons")}</Label>
                <div className="space-y-2">
                  {selectedWeapons.map((sel, idx) => (
                    <div key={`weapon-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1">
                        <WeaponSelect
                          id={`note_weapon_${idx}`}
                          value={sel}
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
                  ))}
                </div>
              </div>
            )}

            {/* PROPERTY TYPE OF SERVICE */}
            {selectedPropertyTypes.length > 0 && (
              <div>
                <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.type_of_services", "Type of Service")}</Label>
                <div className="space-y-2">
                  {selectedPropertyTypes.map((sel, idx) => (
                    <div key={`ptype-${idx}`} className="flex items-center gap-2">
                      <div className="flex-1">
                        <PropertyTypeSelect
                          id={`note_property_type_${idx}`}
                          value={sel}
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
                  ))}
                </div>
              </div>
            )}

            {generalError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{generalError}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? savingText : createText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
