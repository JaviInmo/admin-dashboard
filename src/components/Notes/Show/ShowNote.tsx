"use client";


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import { Button } from "../../ui/button";
import type { Note } from "../type";
import { useI18n } from "../../../i18n";

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

export default function ShowNoteDialog({ note, open, onClose }: Props) {
  const { TEXT } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] ">
        <DialogHeader>
          <DialogTitle className="pl-2">
            {getTextFromObject(TEXT, "menu.notes", "Note")} #{note?.id ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-3">
          {!note ? (
            <p>{getTextFromObject(TEXT, "table.noData", "No note selected.")}</p>
          ) : (
            <>
              <div>
                <p className="text-sm ">{getTextFromObject(TEXT, "services.fields.name", "Name")}</p>
                <p className="font-medium">{note.name}</p>
              </div>

              <div>
                <p className="text-sm ">{getTextFromObject(TEXT, "services.fields.description", "Description")}</p>
                <p className="whitespace-pre-wrap">{note.description ?? "-"}</p>
              </div>

              <div>
                <p className="text-sm ">{getTextFromObject(TEXT, "services.fields.rate", "Amount")}</p>
                <p>{note.amount !== null ? String(note.amount) : note.amount_raw ?? "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm ">Client</p>
                  <p>{note.client ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm ">Property</p>
                  <p>{note.property_obj ?? "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p>Created</p>
                  <p>{note.created_at ?? "-"}</p>
                </div>
                <div>
                  <p>Updated</p>
                  <p>{note.updated_at ?? "-"}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={onClose}>{getTextFromObject(TEXT, "actions.close", "Close")}</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
