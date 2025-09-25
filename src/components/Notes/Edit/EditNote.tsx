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

interface Props {
  note: Note;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
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

export default function EditNoteDialog({ note, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();

  const [name, setName] = React.useState<string>(note?.name ?? "");
  const [description, setDescription] = React.useState<string | null>(note?.description ?? null);
  const [amount, setAmount] = React.useState<string>(note?.amount !== null && note?.amount !== undefined ? String(note.amount) : note?.amount_raw ?? "");
  const [client, setClient] = React.useState<string | "">(
    note?.client !== null && note?.client !== undefined ? String(note.client) : ""
  );
  const [propertyObj, setPropertyObj] = React.useState<string | "">(
    note?.property_obj !== null && note?.property_obj !== undefined ? String(note.property_obj) : ""
  );

  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setName(note?.name ?? "");
    setDescription(note?.description ?? null);
    setAmount(note?.amount !== null && note?.amount !== undefined ? String(note.amount) : note?.amount_raw ?? "");
    setClient(note?.client !== null && note?.client !== undefined ? String(note.client) : "");
    setPropertyObj(note?.property_obj !== null && note?.property_obj !== undefined ? String(note.property_obj) : "");
    setError(null);
  }, [note]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(getTextFromObject(TEXT, "clients.form.validation.firstNameRequired", "Name is required"));
      return;
    }
    if (amount && amount.trim() !== "") {
      const normalized = amount.replace(",", ".");
      if (Number.isNaN(Number(normalized))) {
        setError(getTextFromObject(TEXT, "services.errors.rateInvalid", "Amount must be a number"));
        return;
      }
    }

    setLoading(true);
    try {
      const payload: UpdateNotePayload = {};
      payload.name = name.trim();
      payload.description = description === "" ? null : description ?? null;
      if (amount !== "" && amount !== null) {
        payload.amount = amount;
      }
      payload.client = client === "" ? undefined : Number(client);
      payload.property_obj = propertyObj === "" ? undefined : Number(propertyObj);

      await updateNote(note.id, payload);

      toast.success(getTextFromObject(TEXT, "actions.save", "Note updated"));

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
              <div>
                <Label className="pb-2" >{getTextFromObject(TEXT, "services.fields.name", "Name")} *</Label>
                <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} required />
              </div>

              <div>
                <Label className="pb-2" >{getTextFromObject(TEXT, "services.fields.description", "Description")}</Label>
                <Input value={description ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
              </div>

              <div>
                <Label className="pb-2" >{getTextFromObject(TEXT, "services.fields.rate", "Amount")}</Label>
                <Input value={amount ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} inputMode="decimal" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="pb-2">Client (id)</Label>
                  <Input value={client} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClient(e.target.value)} type="number" />
                </div>
                <div>
                  <Label className="pb-2">Property (id)</Label>
                  <Input value={propertyObj} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyObj(e.target.value)} type="number" />
                </div>
              </div>

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
