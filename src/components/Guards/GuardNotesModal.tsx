"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useI18n } from "@/i18n";
import type { Guard } from "./types";
import type { Note } from "@/components/Notes/type";
import { listNotes } from "@/lib/services/notes";
import NotesTable from "@/components/Notes/NotesTable";

interface Props {
  guard: Guard;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}

/**
 * Nota sobre typings:
 * - RawNote describe la forma "cruda" que puede tener la nota desde la API:
 *   algunos backends devuelven `guards: number[]` o `guards: Array<{id: number}>`
 *   o `guard: number` o `guard: { id: number }`. La función includesGuard
 *   normaliza esas variantes sin usar `any`.
 */
type RawNote = Note & {
  guards?: unknown;
  guard?: unknown;
};

function includesGuard(n: RawNote, guardId: number): boolean {
  // Comprueba campo "guards" (puede ser array de números, strings, o objetos con id)
  const maybeGuards = n.guards;
  if (Array.isArray(maybeGuards)) {
    for (const g of maybeGuards) {
      // número directo
      if (typeof g === "number" && g === guardId) return true;
      // string que representa número
      if (typeof g === "string" && Number(g) === guardId) return true;
      // objeto con id (p.e. { id: 3 })
      if (g && typeof g === "object") {
        const id = (g as { id?: unknown }).id;
        if (typeof id === "number" && id === guardId) return true;
        if (typeof id === "string" && Number(id) === guardId) return true;
      }
    }
  }

  // Comprueba campo "guard" (puede ser número, string o objeto con id)
  const maybeGuard = n.guard;
  if (typeof maybeGuard === "number" && maybeGuard === guardId) return true;
  if (typeof maybeGuard === "string" && Number(maybeGuard) === guardId) return true;
  if (maybeGuard && typeof maybeGuard === "object") {
    const id = (maybeGuard as { id?: unknown }).id;
    if (typeof id === "number" && id === guardId) return true;
    if (typeof id === "string" && Number(id) === guardId) return true;
  }

  return false;
}

export default function GuardNotesModal({ guard, open, onClose, onUpdated }: Props) {
  const { TEXT } = useI18n();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  // Estado local para paginación que permite cambiar rows-per-page
  const [pageSize, setPageSize] = React.useState<number>(10); // default razonable
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open) return;
      setLoading(true);
      try {
        // fetch a reasonably large page so we get most notes (adjust pageSize if needed)
        const resp = await listNotes(1, "", 1000, undefined);
        if (!mounted) return;

        const items: unknown = resp.items ?? [];

        // Narrow items to RawNote[] in a type-safe way
        const arr = Array.isArray(items) ? items as unknown[] : [];

        const filtered: Note[] = arr.filter((it) => {
          // intentamos tratar 'it' como RawNote (sin usar `any`)
          const maybe = it as RawNote;
          return includesGuard(maybe, guard.id);
        }) as Note[];

        setNotes(filtered);
        // reset pagination when notes change / modal opens
        setCurrentPage(1);
      } catch (err) {
        // err puede ser unknown, lo logueamos de forma segura
        console.error("Failed to load notes for guard", guard.id, err);
        setNotes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [open, guard.id]);

  const handleAfterCreate = async () => {
    // refresh local list after creation
    try {
      const resp = await listNotes(1, "", 1000, undefined);
      const items: unknown = resp.items ?? [];
      const arr = Array.isArray(items) ? items as unknown[] : [];

      const filtered: Note[] = arr.filter((it) => {
        const maybe = it as RawNote;
        return includesGuard(maybe, guard.id);
      }) as Note[];

      setNotes(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.warn("Failed to refresh notes after create", err);
    }
    if (onUpdated) await onUpdated();
  };

  const title = `${TEXT.guards?.table?.notesTitle ?? "Notes for"} ${guard.firstName ?? ""} ${guard.lastName ?? ""}`.trim();

  // calcular totalPages desde notes.length
  const totalPages = Math.max(1, Math.ceil((notes?.length ?? 0) / pageSize));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Usamos la prop `size="xl"` para aumentar el ancho y que quepa mejor la tabla */}
      <DialogContent size="xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="pl-4">{title}</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* Renderizamos NotesTable con las notas filtradas y pasamos initialGuardId */}
          <NotesTable
            notes={notes}
            onRefresh={handleAfterCreate}
            serverSide={false}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={(size: number) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            onPageChange={(p: number) => setCurrentPage(p)}
            // Pasamos toggles vacíos porque aquí el filtrado es local
            toggleSort={() => {}}
            sortField={"created_at" as keyof Note}
            sortOrder={"desc" as any}
            isPageLoading={loading}
            // importante: esto hará que CreateNoteDialog abra con el guardia seleccionado
            initialGuardId={guard.id}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
