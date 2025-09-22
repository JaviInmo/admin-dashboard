"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Shift } from "@/components/Shifts/types";
// si quieres formatear la hora, reintroduce isoToLocalTime desde tus utils

type UiTextFragment = {
  shifts?: {
    actionsTitle?: string;
    labels?: {
      plannedStart?: string;
      plannedEnd?: string;
    };
  };
  actions?: {
    close?: string;
    edit?: string;
    delete?: string;
  };
};

/** Leer posible campo snake_case/camelCase desde un objeto sin usar `any`. */
function readStringField(obj: unknown, ...keys: string[]): string | undefined {
  if (obj === null || obj === undefined) return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

export default function ShiftActionsDialog({
  shift,
  open,
  onClose,
  onEdit,
  onDelete,
  TEXT,
}: {
  shift: Shift | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  TEXT?: UiTextFragment;
}) {
  if (!shift) return null;

  const title = TEXT?.shifts?.actionsTitle ?? "Acciones del turno";
  const plannedStartLabel = TEXT?.shifts?.labels?.plannedStart ?? "Planned";
  const plannedEndLabel = TEXT?.shifts?.labels?.plannedEnd ?? "Planned End";

  const closeLabel = TEXT?.actions?.close ?? "Close";
  const editLabel = TEXT?.actions?.edit ?? "Edit";
  const deleteLabel = TEXT?.actions?.delete ?? "Delete";

  // support both camelCase and snake_case fields without using `any`
  const plannedStart =
    shift.plannedStartTime ??
    readStringField(shift, "planned_start_time", "plannedStartTime") ??
    "-";
  const plannedEnd =
    shift.plannedEndTime ??
    readStringField(shift, "planned_end_time", "plannedEndTime") ??
    "-";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="text-sm">
            <strong>ID:</strong> {shift.id}
          </div>
          <div className="text-sm">
            <strong>{plannedStartLabel}:</strong> {plannedStart}
          </div>
          <div className="text-sm">
            <strong>{plannedEndLabel}:</strong> {plannedEnd}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2 w-full">
          <Button variant="ghost" onClick={onClose}>
            {closeLabel}
          </Button>
          <Button onClick={onEdit}>{editLabel}</Button>
          <Button variant="destructive" onClick={onDelete}>
            {deleteLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
