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
import type { AppProperty } from "@/lib/services/properties";
import type { Service } from "@/components/Services/types";
import type { Shift } from "@/components/Shifts/types";
import type { Weapon } from "@/components/Weapons/types";
import type { AppPropertyType } from "@/lib/services/properties";
import type { AppUser } from "@/lib/services/users";

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
}

export default function CreateNote({ open, onClose, onCreated }: Props) {
  const { TEXT } = useI18n();

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // form payload (ids arrays & amounts array)
  const [form, setForm] = useState<CreateNotePayload & { amounts?: (string | number | null)[] }>({
    name: "",
    description: "",
    amount: "", // legacy
    clients: [],
    properties: [],
    guards: [],
    services: [],
    shifts: [],
    weapons: [],
    type_of_services: [],
    amounts: [],
  } as any);

  // selected objects for UI (store the full object or null)
  const [selectedUsers, setSelectedUsers] = useState<(AppUser | null)[]>([]);
  const [selectedGuards, setSelectedGuards] = useState<(Guard | null)[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<(AppProperty | null)[]>([]);
  const [selectedServices, setSelectedServices] = useState<(Service | null)[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<(Shift | null)[]>([]);
  const [selectedWeapons, setSelectedWeapons] = useState<(Weapon | null)[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<(AppPropertyType | null)[]>([]);

  // central chooser for adding new field
  const [fieldToAdd, setFieldToAdd] = useState<FieldType | "">("");

  useEffect(() => {
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetForm = () => {
    setForm({
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
    } as any);

    setSelectedUsers([]);
    setSelectedGuards([]);
    setSelectedProperties([]);
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
    // validate amounts entries
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

  // generic helpers to update arrays in form and selected arrays
  const pushTo = (key: keyof CreateNotePayload | "amounts", value: any) => {
    setForm((prev: any) => {
      const copy = { ...(prev || {}) };
      copy[key] = Array.isArray(copy[key]) ? [...copy[key], value] : [value];
      return copy;
    });
  };
  const removeAt = (key: keyof CreateNotePayload | "amounts", idx: number) => {
    setForm((prev: any) => {
      const copy = { ...(prev || {}) };
      copy[key] = Array.isArray(copy[key]) ? [...copy[key]] : [];
      copy[key].splice(idx, 1);
      return copy;
    });
  };
  const setAt = (key: keyof CreateNotePayload | "amounts", idx: number, value: any) => {
    setForm((prev: any) => {
      const copy = { ...(prev || {}) };
      copy[key] = Array.isArray(copy[key]) ? [...copy[key]] : [];
      copy[key][idx] = value;
      return copy;
    });
  };

  // helpers to update selected object arrays in UI
  const pushSelected = (setter: React.Dispatch<React.SetStateAction<any[]>>, value: any) => {
    setter((prev) => [...prev, value]);
  };
  const removeSelectedAt = (setter: React.Dispatch<React.SetStateAction<any[]>>, idx: number) => {
    setter((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  };
  const setSelectedAt = (setter: React.Dispatch<React.SetStateAction<any[]>>, idx: number, value: any) => {
    setter((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  // add a field from central chooser
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
    setFieldToAdd(""); // reset chooser
  };

  // compute total of amounts (numbers). non-numeric entries treated as 0.
  const computeAmountsTotal = (): number => {
    const arr = Array.isArray(form.amounts) ? form.amounts : [];
    return arr.reduce((acc, v) => {
      const s = v === null || v === undefined ? "" : String(v).trim().replace(",", ".");
      const n = Number(s);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
      };

      if (form.description !== undefined && form.description !== null && form.description !== "") {
        payload.description = form.description;
      }

      // amounts: compute total and send as 'amount'
      if (Array.isArray(form.amounts) && form.amounts.length > 0) {
        const total = computeAmountsTotal();
        // if total is an integer, keep as number; otherwise keep decimals
        payload.amount = total;
      } else if (form.amount !== undefined && form.amount !== null && form.amount !== "") {
        // legacy single amount still supported
        payload.amount = typeof form.amount === "number" ? String(form.amount) : form.amount;
      }

      // add arrays (send only non-empty arrays)
      if (Array.isArray(form.clients) && form.clients.filter((x) => x != null).length > 0) {
        // ensure numbers
        payload.clients = form.clients.map((x: any) => (x == null ? null : Number(x))).filter((x: any) => x != null);
      }
      if (Array.isArray(form.properties) && form.properties.filter((x) => x != null).length > 0) {
        payload.properties = form.properties.map((x: any) => (x == null ? null : Number(x))).filter((x: any) => x != null);
      }
      if (Array.isArray(form.guards) && form.guards.filter((x) => x != null).length > 0) {
        payload.guards = form.guards.map((x: any) => (x == null ? null : Number(x))).filter((x: any) => x != null);
      }
      if (Array.isArray(form.services) && form.services.filter((x) => x != null).length > 0) {
        payload.services = form.services.map((x: any) => (x == null ? null : Number(x))).filter((x: any) => x != null);
      }
      if (Array.isArray(form.shifts) && form.shifts.filter((x) => x != null).length > 0) {
        payload.shifts = form.shifts.map((x: any) => (x == null ? null : Number(x))).filter((x: any) => x != null);
      }
      if (Array.isArray(form.weapons) && form.weapons.filter((x) => x != null).length > 0) {
        payload.weapons = form.weapons.map((x: any) => (x == null ? null : Number(x))).filter((x: any) => x != null);
      }
      if (Array.isArray(form.type_of_services) && form.type_of_services.filter((x) => x != null).length > 0) {
        payload.type_of_services = form.type_of_services
          .map((x: any) => (x == null ? null : Number(x)))
          .filter((x: any) => x != null);
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
              onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))}
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
              onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
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

          {/* AMOUNTS (if any) */}
          {Array.isArray(form.amounts) && form.amounts.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.amounts", "Amounts")}</Label>
              <div className="space-y-2">
                {form.amounts.map((val: any, idx: number) => (
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

          {/* CLIENTS / USERS (if any) */}
          {selectedUsers.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.clients", "Clients")}</Label>
              <div className="space-y-2">
                {selectedUsers.map((sel, idx) => (
                  <div key={`client-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <UserSelect
                        id={`note_user_${idx}`}
                        value={sel ?? null}
                        onChange={(u) => {
                          setSelectedAt(setSelectedUsers, idx, u);
                          setAt("clients", idx, u ? Number((u as any).id) : null);
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

          {/* GUARDS (if any) */}
          {selectedGuards.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.guards", "Guards")}</Label>
              <div className="space-y-2">
                {selectedGuards.map((sel, idx) => (
                  <div key={`guard-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <GuardSelect
                        id={`note_guard_${idx}`}
                        value={sel ?? null}
                        onChange={(g) => {
                          setSelectedAt(setSelectedGuards, idx, g);
                          setAt("guards", idx, g ? Number((g as any).id) : null);
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

          {/* PROPERTIES (if any) */}
          {selectedProperties.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.properties", "Properties")}</Label>
              <div className="space-y-2">
                {selectedProperties.map((sel, idx) => (
                  <div key={`prop-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <PropertySelect
                        id={`note_property_${idx}`}
                        value={sel ?? null}
                        onChange={(p) => {
                          setSelectedAt(setSelectedProperties, idx, p);
                          setAt("properties", idx, p ? Number((p as any).id) : null);
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

          {/* SERVICES (if any) */}
          {selectedServices.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.services", "Services")}</Label>
              <div className="space-y-2">
                {selectedServices.map((sel, idx) => (
                  <div key={`service-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <ServiceSelect
                        id={`note_service_${idx}`}
                        value={sel ?? null}
                        onChange={(s) => {
                          setSelectedAt(setSelectedServices, idx, s);
                          setAt("services", idx, s ? Number((s as any).id) : null);
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

          {/* SHIFTS (if any) */}
          {selectedShifts.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.shifts", "Shifts")}</Label>
              <div className="space-y-2">
                {selectedShifts.map((sel, idx) => (
                  <div key={`shift-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <ShiftSelect
                        id={`note_shift_${idx}`}
                        value={sel ?? null}
                        onChange={(s) => {
                          setSelectedAt(setSelectedShifts, idx, s);
                          setAt("shifts", idx, s ? Number((s as any).id) : null);
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

          {/* WEAPONS (if any) */}
          {selectedWeapons.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.weapons", "Weapons")}</Label>
              <div className="space-y-2">
                {selectedWeapons.map((sel, idx) => (
                  <div key={`weapon-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <WeaponSelect
                        id={`note_weapon_${idx}`}
                        value={sel ?? null}
                        onChange={(w) => {
                          setSelectedAt(setSelectedWeapons, idx, w);
                          setAt("weapons", idx, w ? Number((w as any).id) : null);
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

          {/* PROPERTY TYPE OF SERVICE (if any) */}
          {selectedPropertyTypes.length > 0 && (
            <div>
              <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.type_of_services", "Type of Service")}</Label>
              <div className="space-y-2">
                {selectedPropertyTypes.map((sel, idx) => (
                  <div key={`ptype-${idx}`} className="flex items-center gap-2">
                    <div className="flex-1">
                      <PropertyTypeSelect
                        id={`note_property_type_${idx}`}
                        value={sel ?? null}
                        onChange={(t) => {
                          setSelectedAt(setSelectedPropertyTypes, idx, t);
                          setAt("type_of_services", idx, t ? Number((t as any).id) : null);
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
