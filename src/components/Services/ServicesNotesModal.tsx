// src/components/Services/ServicesNotesModal.tsx
"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import type { Service } from "./types";
import type { Note } from "@/components/Notes/type";
import { listNotes } from "@/lib/services/notes";
import NotesTable from "@/components/Notes/NotesTable";

interface Props {
  service: Service;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

/**
 * RawNote puede contener `services`, `service`, o incluso `assigned_service`.
 * Normalizamos y comparamos de forma segura.
 */
type RawNote = Note & {
  services?: unknown;
  service?: unknown;
  assigned_service?: unknown;
};

function includesService(n: RawNote, serviceId: number): boolean {
  const maybeArr = n.services;
  if (Array.isArray(maybeArr)) {
    for (const it of maybeArr) {
      if (typeof it === "number" && it === serviceId) return true;
      if (typeof it === "string" && Number(it) === serviceId) return true;
      if (it && typeof it === "object") {
        const id = (it as { id?: unknown }).id;
        if (typeof id === "number" && id === serviceId) return true;
        if (typeof id === "string" && Number(id) === serviceId) return true;
      }
    }
  }

  const maybeSingle = n.service ?? n.assigned_service;
  if (typeof maybeSingle === "number" && maybeSingle === serviceId) return true;
  if (typeof maybeSingle === "string" && Number(maybeSingle) === serviceId) return true;
  if (maybeSingle && typeof maybeSingle === "object") {
    const id = (maybeSingle as { id?: unknown }).id;
    if (typeof id === "number" && id === serviceId) return true;
    if (typeof id === "string" && Number(id) === serviceId) return true;
  }

  return false;
}

export default function ServicesNotesModal({ service, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  // pagination local
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    let mounted = true;
    async function loadNotes() {
      if (!open) return;
      setLoading(true);
      try {
        const resp = await listNotes(1, "", 1000, undefined);
        if (!mounted) return;
        const items: unknown = resp.items ?? [];
        const arr = Array.isArray(items) ? items as unknown[] : [];

        const sid = Number((service as unknown as { id?: unknown })?.id ?? NaN);

        const filtered: Note[] = arr
          .filter((it) => includesService(it as RawNote, sid))
          .map((x) => x as Note);

        setNotes(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load notes for service", service.id, err);
        setNotes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadNotes();
    return () => { mounted = false; };
  }, [open, service]);

  const handleAfterCreate = async () => {
    try {
      const resp = await listNotes(1, "", 1000, undefined);
      const items: unknown = resp.items ?? [];
      const arr = Array.isArray(items) ? items as unknown[] : [];
      const sid = Number((service as unknown as { id?: unknown })?.id ?? NaN);

      const filtered: Note[] = arr
        .filter((it) => includesService(it as RawNote, sid))
        .map((x) => x as Note);

      setNotes(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.warn("Failed to refresh notes after create", err);
    }
    if (onUpdated) await onUpdated();
  };

  const title = `${TEXT.services?.table?.notesTitle ?? "Notes for service"} ${service.name ?? `#${service.id}`}`;

  const totalPages = Math.max(1, Math.ceil(((notes?.length ?? 0) as number) / (Number(pageSize) || 1)));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="pl-4">{title}</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <NotesTable
            notes={notes}
            onRefresh={handleAfterCreate}
            serverSide={false}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={(s: number) => { setPageSize(s); setCurrentPage(1); }}
            onPageChange={(p: number) => setCurrentPage(p)}
            toggleSort={() => {}}
            sortField={"created_at" as keyof Note}
            sortOrder={"desc" as any}
            isPageLoading={loading}
            // Pasamos initialGuardId/initialPropertyId para que CreateNote desde NotesTable pueda prefilar
            initialGuardId={Number(service.guard ?? NaN)}
            initialPropertyId={Number(service.assignedProperty ?? NaN)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
