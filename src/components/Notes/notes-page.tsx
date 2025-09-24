// src/components/Notes/notes-page.tsx
"use client";

import * as React from "react";
import { StickyNote } from "lucide-react";
import { NotesContainer } from "./NoteContainer";

export default function NotesPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <StickyNote className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notas</h1>
            
          </div>
        </div>

        {/* Aquí puedes añadir botones/acciones (nuevo, importar, filtros, etc.) */}
        <div className="flex items-center space-x-2">
          {/* ejemplo visual sólo; conecta con tu CreateNote más adelante */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm shadow-sm hover:bg-muted"
            onClick={() => {
              // Si quieres abrir un modal, controla el estado aquí.
              // Actualmente sólo hace console.log para no asumir API de tus CRUD.
              console.log("Abrir modal de crear nota (implementar)");
            }}
          >
            Nueva nota
          </button>
        </div>
      </div>

      <div className="flex-1">
        <NotesContainer />
      </div>
    </div>
  );
}
