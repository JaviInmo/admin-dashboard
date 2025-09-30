// src/components/Clients/ClientsNotesModal.tsx
"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import type { Client as AppClient } from "./types";
import type { Note } from "@/components/Notes/type";
import { listNotes } from "@/lib/services/notes";
import NotesTable from "@/components/Notes/NotesTable";

interface Props {
  client: AppClient;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

/**
 * RawNote shape puede variar: `clients`, `client`, `user`, `users`, etc.
 * Hacemos checks robustos con unknown.
 */
type RawNote = Note & {
  clients?: unknown;
  client?: unknown;
  user?: unknown;
  users?: unknown;
};

function includesClient(n: RawNote, clientId: number): boolean {
  const maybeArr = n.clients ?? n.users;
  if (Array.isArray(maybeArr)) {
    for (const it of maybeArr) {
      if (typeof it === "number" && it === clientId) return true;
      if (typeof it === "string" && Number(it) === clientId) return true;
      if (it && typeof it === "object") {
        const id = (it as { id?: unknown }).id;
        if (typeof id === "number" && id === clientId) return true;
        if (typeof id === "string" && Number(id) === clientId) return true;
      }
    }
  }

  const maybeSingle = n.client ?? n.user;
  if (typeof maybeSingle === "number" && maybeSingle === clientId) return true;
  if (typeof maybeSingle === "string" && Number(maybeSingle) === clientId) return true;
  if (maybeSingle && typeof maybeSingle === "object") {
    const id = (maybeSingle as { id?: unknown }).id;
    if (typeof id === "number" && id === clientId) return true;
    if (typeof id === "string" && Number(id) === clientId) return true;
  }

  return false;
}

export default function ClientsNotesModal({ client, open, onClose, onUpdated }: Props) {
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

        const clientId = Number((client as unknown as { id?: unknown })?.id ?? NaN);

        const filtered: Note[] = arr
          .filter((it) => includesClient(it as RawNote, clientId))
          .map((x) => x as Note);

        setNotes(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load notes for client", client.id, err);
        setNotes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadNotes();
    return () => { mounted = false; };
  }, [open, client]);

  const handleAfterCreate = async () => {
    try {
      const resp = await listNotes(1, "", 1000, undefined);
      const items: unknown = resp.items ?? [];
      const arr = Array.isArray(items) ? items as unknown[] : [];

      const clientId = Number((client as unknown as { id?: unknown })?.id ?? NaN);

      const filtered: Note[] = arr
        .filter((it) => includesClient(it as RawNote, clientId))
        .map((x) => x as Note);

      setNotes(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.warn("Failed to refresh notes after create", err);
    }
    if (onUpdated) await onUpdated();
  };

  const title = `${TEXT.clients?.table?.notesTitle ?? "Notes for client"} ${client.username ?? `#${client.id}`}`;

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
            // PASAMOS initialUserId para que CreateNote abra con el usuario/cliente seleccionado.
            // preferimos `client.user` (si existe) porque apunta al user real; sino usamos client.id.
            initialUserId={Number((client as unknown as { user?: unknown })?.user ?? (client as unknown as { id?: unknown })?.id ?? NaN)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
