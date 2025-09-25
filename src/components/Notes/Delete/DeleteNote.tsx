"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import type { Note } from "../type";
import { deleteNote } from "../../../lib/services/notes";
import { showErrorToast, showCreatedToast } from "../../../lib/toast-helpers";
import { useI18n } from "../../../i18n";

interface Props {
  note: Note | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void | Promise<void>;
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

export default function DeleteNoteDialog({ note, open, onClose, onDeleted }: Props) {
  const { TEXT } = useI18n();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setLoading(false);
      setError(null);
    }
  }, [open]);

  const handleDelete = async () => {
    if (!note) return;
    setLoading(true);
    setError(null);
    try {
      await deleteNote(note.id);
      showCreatedToast(getTextFromObject(TEXT, "actions.delete", "Note deleted"));
      if (onDeleted) await onDeleted();
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error deleting note:", err);
      setError(getTextFromObject(TEXT, "actions.delete", "Failed to delete note"));
      showErrorToast(getTextFromObject(TEXT, "actions.delete", "Failed to delete note"));
    } finally {
      setLoading(false);
    }
  };

  const cancelText = getTextFromObject(TEXT, "actions.cancel", "Cancel");
  const deletingText = getTextFromObject(TEXT, "actions.deleting", "Deleting...");
  const deleteText = getTextFromObject(TEXT, "actions.delete", "Delete");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{getTextFromObject(TEXT, "actions.delete", "Delete")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!note ? (
            <p>{getTextFromObject(TEXT, "table.noData", "No note selected")}</p>
          ) : (
            <>
              <div>
                <p className="font-medium">{getTextFromObject(TEXT, "actions.delete", "Are you sure you want to delete this note?")}</p>
              </div>

              <div className="p-3 rounded border bg-muted/20">
                <p className="font-semibold">{note.name}</p>
                {note.description && <p className="text-sm text-slate-600">{note.description}</p>}
                <div className="text-sm text-slate-700 mt-2">
                  <p>Amount: {note.amount !== null ? String(note.amount) : note.amount_raw ?? "-"}</p>
                  <p>Client: {note.client ?? "-"}</p>
                  <p>Property: {note.property_obj ?? "-"}</p>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  {cancelText}
                </Button>
                <Button onClick={handleDelete} disabled={loading} variant="destructive">
                  {loading ? deletingText : deleteText}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
