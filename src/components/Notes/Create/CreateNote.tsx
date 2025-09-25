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

  const [form, setForm] = useState<CreateNotePayload>({
    name: "",
    description: "",
    amount: "",
    client: null,
    property_obj: null,
    guard: undefined,
    service: undefined,
    shift: undefined,
    weapon: undefined,
    property_type_of_service: undefined,
  } as unknown as CreateNotePayload);

  // selected objects para mostrar en UI
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<AppProperty | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState<AppPropertyType | null>(null);

  useEffect(() => {
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      amount: "",
      client: null,
      property_obj: null,
      guard: undefined,
      service: undefined,
      shift: undefined,
      weapon: undefined,
      property_type_of_service: undefined,
    } as unknown as CreateNotePayload);

    setSelectedUser(null);
    setSelectedGuard(null);
    setSelectedProperty(null);
    setSelectedService(null);
    setSelectedShift(null);
    setSelectedWeapon(null);
    setSelectedPropertyType(null);

    setErrors({});
    setGeneralError(null);
    setLoading(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name || !String(form.name).trim()) {
      newErrors.name = getTextFromObject(TEXT, "services.errors.nameRequired", "Name is required");
    }
    if (form.amount && String(form.amount).trim() !== "") {
      const normalized = String(form.amount).replace(",", ".");
      if (Number.isNaN(Number(normalized))) {
        newErrors.amount = getTextFromObject(TEXT, "services.errors.rateInvalid", "Amount must be a number");
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

  const handleChange = (field: keyof CreateNotePayload, value: string | number | null | undefined) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field as string];
        return copy;
      });
    }
    if (generalError) setGeneralError(null);
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

      if (form.amount !== undefined && form.amount !== null && form.amount !== "") {
        payload.amount = typeof form.amount === "number" ? String(form.amount) : form.amount;
      }

      // enviar solo ids (u omitidos)
      if (form.client !== undefined) payload.client = form.client;
      if (form.property_obj !== undefined) payload.property_obj = form.property_obj;
      if (form.guard !== undefined) payload.guard = form.guard;
      if (form.service !== undefined) payload.service = form.service;
      if (form.shift !== undefined) payload.shift = form.shift;
      if (form.weapon !== undefined) payload.weapon = form.weapon;
      if (form.property_type_of_service !== undefined) payload.property_type_of_service = form.property_type_of_service;

      await createNote(payload as CreateNotePayload);
      showCreatedToast(getTextFromObject(TEXT, "actions.create", "Note created"));

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
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{createText}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="pb-2" htmlFor="note_name">
              {getTextFromObject(TEXT, "services.fields.name", "Name")} *
            </Label>
            <Input
              id="note_name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder={getTextFromObject(TEXT, "services.placeholders.name", "Note name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label className="pb-2" htmlFor="note_description">
              {getTextFromObject(TEXT, "services.fields.description", "Description")}
            </Label>
            <Input
              id="note_description"
              value={form.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder={getTextFromObject(TEXT, "services.placeholders.description", "Description (optional)")}
            />
          </div>

          <div>
            <Label className="pb-2" htmlFor="note_amount">
              {getTextFromObject(TEXT, "services.fields.rate", "Amount")}
            </Label>
            <Input
              id="note_amount"
              value={form.amount ?? ""}
              onChange={(e) => handleChange("amount", e.target.value)}
              placeholder="e.g. 100.50"
              inputMode="decimal"
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
          </div>

          {/* Grid of selects (frontend shows objects; form keeps ids) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="pb-2">User</Label>
              <UserSelect
                id="note_user"
                value={selectedUser}
                onChange={(u) => {
                  setSelectedUser(u);
                  handleChange("client" as keyof CreateNotePayload, u ? Number(u.id) : null);
                }}
                placeholder="Buscar usuario..."
              />
            </div>

            <div>
              <Label className="pb-2">Guard</Label>
              <GuardSelect
                id="note_guard"
                value={selectedGuard}
                onChange={(g) => {
                  setSelectedGuard(g);
                  handleChange("guard" as keyof CreateNotePayload, g ? Number(g.id) : null);
                }}
                placeholder="Buscar guard..."
              />
            </div>

            <div>
              <Label className="pb-2">Property</Label>
              <PropertySelect
                id="note_property_select"
                value={selectedProperty}
                onChange={(p) => {
                  setSelectedProperty(p);
                  handleChange("property_obj" as keyof CreateNotePayload, p ? Number(p.id) : null);
                }}
                placeholder="Buscar propiedad..."
              />
            </div>

            <div>
              <Label className="pb-2">Service</Label>
              <ServiceSelect
                id="note_service"
                value={selectedService}
                onChange={(s) => {
                  setSelectedService(s);
                  handleChange("service" as keyof CreateNotePayload, s ? Number(s.id) : null);
                }}
                placeholder="Buscar servicio..."
              />
            </div>

            <div>
              <Label className="pb-2">Shift</Label>
              <ShiftSelect
                id="note_shift"
                value={selectedShift}
                onChange={(s) => {
                  setSelectedShift(s);
                  handleChange("shift" as keyof CreateNotePayload, s ? Number(s.id) : null);
                }}
                placeholder="Buscar shift..."
              />
            </div>

            <div>
              <Label className="pb-2">Weapon</Label>
              <WeaponSelect
                id="note_weapon"
                value={selectedWeapon}
                onChange={(w) => {
                  setSelectedWeapon(w);
                  handleChange("weapon" as keyof CreateNotePayload, w ? Number(w.id) : null);
                }}
                placeholder="Buscar arma..."
              />
            </div>

            <div>
              <Label className="pb-2">Property Type of Service</Label>
              <PropertyTypeSelect
                id="note_property_type"
                value={selectedPropertyType}
                onChange={(t) => {
                  setSelectedPropertyType(t);
                  handleChange("property_type_of_service" as keyof CreateNotePayload, t ? Number(t.id) : null);
                }}
                placeholder="Buscar tipo de servicio..."
              />
            </div>
          </div>

          {/* Hidden inputs (no mostrar ids en UI) */}
          <input type="hidden" name="client" value={String(form.client ?? "")} />
          <input type="hidden" name="property_obj" value={String(form.property_obj ?? "")} />
          <input type="hidden" name="guard" value={String((form as any).guard ?? "")} />
          <input type="hidden" name="service" value={String((form as any).service ?? "")} />
          <input type="hidden" name="shift" value={String((form as any).shift ?? "")} />
          <input type="hidden" name="weapon" value={String((form as any).weapon ?? "")} />
          <input
            type="hidden"
            name="property_type_of_service"
            value={String((form as any).property_type_of_service ?? "")}
          />

          {generalError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{generalError}</p>
            </div>
          )}

          <div className="flex justify-end items-center gap-2 pt-2">
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
