"use client";

import React, { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { useI18n } from "../../../i18n";
import { createNote } from "../../../lib/services/notes";
import { showCreatedToast, showErrorToast } from "../../../lib/toast-helpers";
import type { CreateNotePayload } from "../type";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void | Promise<void>;
}

/**
 * Seguridad al leer textos: TEXT puede tener cualquier forma.
 * getText navega de forma segura y devuelve fallback si no existe.
 */
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
  });

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
    });
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

  const handleChange = (field: keyof CreateNotePayload, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      const payload: CreateNotePayload = {
        ...form,
        amount:
          form.amount === null || form.amount === undefined || form.amount === ""
            ? undefined
            : typeof form.amount === "number"
            ? String(form.amount)
            : String(form.amount),
      };

      await createNote(payload);
      showCreatedToast(getTextFromObject(TEXT, "actions.create", "Note created"));

      if (onCreated) {
        await onCreated();
      }

      resetForm();
      onClose();
    } catch (err) {
      // err puede ser cualquier cosa; registramos y mostramos mensaje amigable
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="">
          <DialogTitle >{createText}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 ">
          <div>
            <Label className="pb-2" htmlFor="note_name">{getTextFromObject(TEXT, "services.fields.name", "Name")} *</Label>
            <Input
              id="note_name"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("name", e.target.value)}
              placeholder={getTextFromObject(TEXT, "services.placeholders.name", "Note name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label className="pb-2" htmlFor="note_description">{getTextFromObject(TEXT, "services.fields.description", "Description")}</Label>
            <Input
              id="note_description"
              value={form.description ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("description", e.target.value)}
              placeholder={getTextFromObject(TEXT, "services.placeholders.description", "Description (optional)")}
            />
          </div>

          <div>
            <Label className="pb-2" htmlFor="note_amount">{getTextFromObject(TEXT, "services.fields.rate", "Amount")}</Label>
            <Input
              id="note_amount"
              value={form.amount ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange("amount", e.target.value)}
              placeholder="e.g. 100.50"
              inputMode="decimal"
              className={errors.amount ? "border-red-500" : ""}
            />
            {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="pb-2" htmlFor="note_client">Client (id)</Label>
              <Input
                id="note_client"
                value={form.client ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  handleChange("client", v === "" ? null : Number(v));
                }}
                placeholder="Client id (optional)"
                type="number"
              />
            </div>

            <div>
              <Label className="pb-2" htmlFor="note_property">Property (id)</Label>
              <Input
                id="note_property"
                value={form.property_obj ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  handleChange("property_obj", v === "" ? null : Number(v));
                }}
                placeholder="Property id (optional)"
                type="number"
              />
            </div>
          </div>

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
