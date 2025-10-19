// src/components/Users/UsersNotesModal.tsx
"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import type { User } from "./types";
import type { Note } from "@/components/Notes/type";
import { listNotes } from "@/lib/services/notes";
import NotesTable from "@/components/Notes/NotesTable";

interface Props {
  user: User;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

/**
 * RawNote describe posibles formas que vienen del backend, lo tratamos con unknown y checks
 */
type RawNote = Note & {
  clients?: unknown;
  client?: unknown;
  user?: unknown;
  users?: unknown;
};

function includesUser(n: RawNote, userId: number): boolean {
  // check clients / users arrays
  const maybeArr = (n.clients ?? n.users) as unknown;
  if (Array.isArray(maybeArr)) {
    for (const it of maybeArr) {
      if (typeof it === "number" && it === userId) return true;
      if (typeof it === "string" && Number(it) === userId) return true;
      if (it && typeof it === "object") {
        const id = (it as { id?: unknown }).id;
        if (typeof id === "number" && id === userId) return true;
        if (typeof id === "string" && Number(id) === userId) return true;
      }
    }
  }

  // single client/user field
  const maybeSingle = (n.client ?? n.user) as unknown;
  if (typeof maybeSingle === "number" && maybeSingle === userId) return true;
  if (typeof maybeSingle === "string" && Number(maybeSingle) === userId) return true;
  if (maybeSingle && typeof maybeSingle === "object") {
    const id = (maybeSingle as { id?: unknown }).id;
    if (typeof id === "number" && id === userId) return true;
    if (typeof id === "string" && Number(id) === userId) return true;
  }

  return false;
}

export default function UsersNotesModal({ user, open, onClose, onUpdated }: Props) {
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

        const userId = Number((user as unknown as { id?: unknown })?.id ?? NaN);

        const filtered: Note[] = arr
          .filter((it) => includesUser(it as RawNote, userId))
          .map((x) => x as Note);

        setNotes(filtered);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load notes for user", user.id, err);
        setNotes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadNotes();
    return () => { mounted = false; };
  }, [open, user]);

  const handleAfterCreate = async () => {
    try {
      const resp = await listNotes(1, "", 1000, undefined);
      const items: unknown = resp.items ?? [];
      const arr = Array.isArray(items) ? items as unknown[] : [];

      const userId = Number((user as unknown as { id?: unknown })?.id ?? NaN);

      const filtered: Note[] = arr
        .filter((it) => includesUser(it as RawNote, userId))
        .map((x) => x as Note);

      setNotes(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.warn("Failed to refresh notes after create", err);
    }
    if (onUpdated) await onUpdated();
  };

  const title = `${TEXT.users?.table?.notesTitle ?? "Notes for user"} ${user.username ?? `${user.id}`}`;

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
            sortOrder={"desc" as "asc" | "desc"}
            isPageLoading={loading}
            // PASAMOS initialUserId para autocompletar user en CreateNote
            initialUserId={Number((user as unknown as { id?: unknown })?.id ?? NaN)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
