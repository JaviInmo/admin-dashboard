"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import type { AppProperty } from "@/lib/services/properties";
import type { Note } from "@/components/Notes/type";
import { listNotes } from "@/lib/services/notes";
import NotesTable from "@/components/Notes/NotesTable";

interface Props {
  property: AppProperty;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

/**
 * RawNote shape can vary across APIs (properties vs property fields).
 * We coerce safely using unknown checks.
 */
type RawNote = Note & {
  properties?: unknown;
  property?: unknown;
};

function includesProperty(n: RawNote, propertyId: number): boolean {
  const maybeProps = n.properties;
  if (Array.isArray(maybeProps)) {
    for (const p of maybeProps) {
      if (typeof p === "number" && p === propertyId) return true;
      if (typeof p === "string" && Number(p) === propertyId) return true;
      if (p && typeof p === "object") {
        const id = (p as { id?: unknown }).id;
        if (typeof id === "number" && id === propertyId) return true;
        if (typeof id === "string" && Number(id) === propertyId) return true;
      }
    }
  }

  const maybeProp = n.property;
  if (typeof maybeProp === "number" && maybeProp === propertyId) return true;
  if (typeof maybeProp === "string" && Number(maybeProp) === propertyId) return true;
  if (maybeProp && typeof maybeProp === "object") {
    const id = (maybeProp as { id?: unknown }).id;
    if (typeof id === "number" && id === propertyId) return true;
    if (typeof id === "string" && Number(id) === propertyId) return true;
  }

  return false;
}

export default function PropertyNotesModal({ property, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  // pagination local so rows-per-page selector works
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    let mounted = true;
    async function loadNotes() {
      if (!open) return;
      setLoading(true);
      try {
        // get a large page and filter locally
        const resp = await listNotes(1, "", 1000, undefined);
        if (!mounted) return;
        const items: unknown = resp.items ?? [];
        const arr = Array.isArray(items) ? items as unknown[] : [];

        // Ensure property id is a number for comparisons
        const propertyId = Number((property as unknown as { id?: unknown })?.id ?? NaN);

        const filtered: Note[] = arr
          .filter((it) => includesProperty(it as RawNote, propertyId))
          .map((x) => x as Note);

        setNotes(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load notes for property", property.id, err);
        setNotes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadNotes();
    return () => { mounted = false; };
  }, [open, property]);

  const handleAfterCreate = async () => {
    try {
      const resp = await listNotes(1, "", 1000, undefined);
      const items: unknown = resp.items ?? [];
      const arr = Array.isArray(items) ? items as unknown[] : [];

      const propertyId = Number((property as unknown as { id?: unknown })?.id ?? NaN);

      const filtered: Note[] = arr
        .filter((it) => includesProperty(it as RawNote, propertyId))
        .map((x) => x as Note);

      setNotes(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.warn("Failed to refresh notes after create", err);
    }
    if (onUpdated) await onUpdated();
  };

  const title = `${TEXT.properties?.table?.notesTitle ?? "Notes for property"} ${property.name ?? property.alias ?? `#${property.id}`}`;

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
            // PASAMOS initialPropertyId para que al crear nota desde este contexto
            // el campo 'property' quede preseleccionado con la propiedad actual.
            initialPropertyId={Number((property as unknown as { id?: unknown })?.id ?? NaN)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
