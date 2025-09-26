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

type FieldType =
  | "amount"
  | "client"
  | "guard"
  | "property"
  | "service"
  | "shift"
  | "weapon"
  | "property_type";

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

  // Form internal structure: arrays for relations and amounts array for editable amounts
  const [form, setForm] = React.useState<{
    amounts: (string | number | null)[];
    clients: (number | null)[];
    properties: (number | null)[];
    guards: (number | null)[];
    services: (number | null)[];
    shifts: (number | null)[];
    weapons: (number | null)[];
    type_of_services: (number | null)[];
  }>({
    amounts: [],
    clients: [],
    properties: [],
    guards: [],
    services: [],
    shifts: [],
    weapons: [],
    type_of_services: [],
  });

  // Selected object arrays for UI selects (store full object if chosen, otherwise null)
  const [selectedUsers, setSelectedUsers] = React.useState<(any | null)[]>([]);
  const [selectedGuards, setSelectedGuards] = React.useState<(any | null)[]>([]);
  const [selectedProperties, setSelectedProperties] = React.useState<(any | null)[]>([]);
  const [selectedServices, setSelectedServices] = React.useState<(any | null)[]>([]);
  const [selectedShifts, setSelectedShifts] = React.useState<(any | null)[]>([]);
  const [selectedWeapons, setSelectedWeapons] = React.useState<(any | null)[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = React.useState<(any | null)[]>([]);

  // central chooser
  const [fieldToAdd, setFieldToAdd] = React.useState<FieldType | "">("");

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorsMap, setErrorsMap] = React.useState<Record<string, string>>({});

  // initialize state from note
  React.useEffect(() => {
    setName(note?.name ?? "");
    setDescription(note?.description ?? null);

    // amounts: if backend only has amount (total), initialize with one entry with that value
    const initialAmounts: (string | number | null)[] =
      note && (note.amount !== null && note.amount !== undefined)
        ? [String(note.amount)]
        : [];

    // relations: prefer arrays, fallback to single legacy fields
    const clientsArr: (number | null)[] =
      note && Array.isArray((note as any).clients) && (note as any).clients.length > 0
        ? [...(note as any).clients]
        : note && typeof note.client === "number"
        ? [note.client]
        : [];

    const propertiesArr: (number | null)[] =
      note && Array.isArray((note as any).properties) && (note as any).properties.length > 0
        ? [...(note as any).properties]
        : note && typeof note.property_obj === "number"
        ? [note.property_obj]
        : [];

    const guardsArr: (number | null)[] = note && Array.isArray((note as any).guards) ? [...(note as any).guards] : [];
    const servicesArr: (number | null)[] = note && Array.isArray((note as any).services) ? [...(note as any).services] : [];
    const shiftsArr: (number | null)[] = note && Array.isArray((note as any).shifts) ? [...(note as any).shifts] : [];
    const weaponsArr: (number | null)[] = note && Array.isArray((note as any).weapons) ? [...(note as any).weapons] : [];
    const typesArr: (number | null)[] =
      note && Array.isArray((note as any).type_of_services) ? [...(note as any).type_of_services] : [];

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

    // selected arrays init as null placeholders (we don't have full objects, only ids)
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

  // helpers to mutate arrays in form
  const pushTo = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: Array.isArray(prev[key]) ? [...(prev[key] as any[]), value] : [value] }));
  };
  const removeAt = (key: keyof typeof form, idx: number) => {
    setForm((prev) => {
      const copy = { ...prev };
      copy[key] = Array.isArray(copy[key]) ? [...(copy[key] as any[])] : [];
      (copy[key] as any[]).splice(idx, 1);
      return copy;
    });
  };
  const setAt = (key: keyof typeof form, idx: number, value: any) => {
    setForm((prev) => {
      const copy = { ...prev };
      copy[key] = Array.isArray(copy[key]) ? [...(copy[key] as any[])] : [];
      (copy[key] as any[])[idx] = value;
      return copy;
    });
  };

  // helpers for selected object arrays
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

  const computeAmountsTotal = (): number => {
    const arr = Array.isArray(form.amounts) ? form.amounts : [];
    return arr.reduce((acc, v) => {
      const s = v === null || v === undefined ? "" : String(v).trim().replace(",", ".");
      const n = Number(s);
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name || !name.trim()) {
      newErrors.name = getTextFromObject(TEXT, "notes.create.validation.nameRequired", "Name is required");
    }
    // amounts validation
    (form.amounts || []).forEach((a, idx) => {
      if (a !== null && a !== undefined && String(a).trim() !== "") {
        const normalized = String(a).replace(",", ".");
        if (Number.isNaN(Number(normalized))) {
          newErrors[`amounts.${idx}`] = getTextFromObject(TEXT, "notes.create.validation.amountInvalid", "Amount must be a valid number");
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

      // amounts => compute total and send as payload.amount
      if (Array.isArray(form.amounts) && form.amounts.length > 0) {
        payload.amount = computeAmountsTotal();
      }

      // send arrays only if non-empty (and cast to numbers)
      const pushIfAny = (key: keyof typeof form, outKey?: string) => {
        const arr = Array.isArray(form[key]) ? (form[key] as any[]).filter((x) => x != null) : [];
        if (arr.length > 0) {
          payload[(outKey ?? (key as string)) as keyof UpdateNotePayload] = arr.map((x) => Number(x));
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
      // eslint-disable-next-line no-console
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
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pl-4">{getTextFromObject(TEXT, "actions.edit", "Edit")} — #{note?.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {isMissingNote ? (
            <p>{getTextFromObject(TEXT, "table.noData", "Note data unavailable")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name & Description always visible */}
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
                <div className="text-sm text-muted-foreground ml-4">
                  {getTextFromObject(TEXT, "notes.create.help.amountsSummary", "You can add amounts, clients and other relations.")}
                </div>
              </div>

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
                      <div className="text-xs text-muted-foreground mt-1">
                        {getTextFromObject(TEXT, "notes.create.amountsHelp", "You can add multiple amounts (positive or negative). They will be summed and the final total sent to the backend.")}
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
                    {form.clients.map((id, idx) => (
                      <div key={`client-${idx}`} className="flex items-center gap-2">
                        <div className="flex-1">
                          <UserSelect
                            id={`note_user_${idx}`}
                            value={selectedUsers[idx] ?? null}
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

              {/* GUARDS */}
              {Array.isArray(form.guards) && form.guards.length > 0 && (
                <div>
                  <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.guards", "Guards")}</Label>
                  <div className="space-y-2">
                    {form.guards.map((id, idx) => (
                      <div key={`guard-${idx}`} className="flex items-center gap-2">
                        <div className="flex-1">
                          <GuardSelect
                            id={`note_guard_${idx}`}
                            value={selectedGuards[idx] ?? null}
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

              {/* PROPERTIES */}
              {Array.isArray(form.properties) && form.properties.length > 0 && (
                <div>
                  <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.properties", "Properties")}</Label>
                  <div className="space-y-2">
                    {form.properties.map((id, idx) => (
                      <div key={`prop-${idx}`} className="flex items-center gap-2">
                        <div className="flex-1">
                          <PropertySelect
                            id={`note_property_${idx}`}
                            value={selectedProperties[idx] ?? null}
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

              {/* SERVICES */}
              {Array.isArray(form.services) && form.services.length > 0 && (
                <div>
                  <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.services", "Services")}</Label>
                  <div className="space-y-2">
                    {form.services.map((id, idx) => (
                      <div key={`service-${idx}`} className="flex items-center gap-2">
                        <div className="flex-1">
                          <ServiceSelect
                            id={`note_service_${idx}`}
                            value={selectedServices[idx] ?? null}
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

              {/* SHIFTS */}
              {Array.isArray(form.shifts) && form.shifts.length > 0 && (
                <div>
                  <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.shifts", "Shifts")}</Label>
                  <div className="space-y-2">
                    {form.shifts.map((id, idx) => (
                      <div key={`shift-${idx}`} className="flex items-center gap-2">
                        <div className="flex-1">
                          <ShiftSelect
                            id={`note_shift_${idx}`}
                            value={selectedShifts[idx] ?? null}
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

              {/* WEAPONS */}
              {Array.isArray(form.weapons) && form.weapons.length > 0 && (
                <div>
                  <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.weapons", "Weapons")}</Label>
                  <div className="space-y-2">
                    {form.weapons.map((id, idx) => (
                      <div key={`weapon-${idx}`} className="flex items-center gap-2">
                        <div className="flex-1">
                          <WeaponSelect
                            id={`note_weapon_${idx}`}
                            value={selectedWeapons[idx] ?? null}
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

              {/* PROPERTY TYPES */}
              {Array.isArray(form.type_of_services) && form.type_of_services.length > 0 && (
                <div>
                  <Label className="pb-2">{getTextFromObject(TEXT, "notes.create.fields.type_of_services", "Type of Service")}</Label>
                  <div className="space-y-2">
                    {form.type_of_services.map((id, idx) => (
                      <div key={`ptype-${idx}`} className="flex items-center gap-2">
                        <div className="flex-1">
                          <PropertyTypeSelect
                            id={`note_property_type_${idx}`}
                            value={selectedPropertyTypes[idx] ?? null}
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

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
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
