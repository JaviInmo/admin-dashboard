"use client";

import * as React from "react";
import { Pencil, Trash, Eye, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReusableTable, type Column } from "@/components/ui/reusable-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Note } from "./type";
import type { SortOrder } from "@/lib/sort";
import { useI18n } from "@/i18n";
import CreateNoteDialog from "./Create/CreateNote";
import EditNoteDialog from "./Edit/EditNote";
import DeleteNoteDialog from "./Delete/DeleteNote";
import ShowNoteDialog from "./Show/ShowNote";

function TruncatedText({ text, maxLength = 60 }: { text?: string | null; maxLength?: number }) {
  const val = text ?? "";
  if (val.length <= maxLength) return <span>{val}</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help truncate block max-w-[300px]">{val.substring(0, maxLength)}…</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="whitespace-normal break-words">{val}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface NotesTableProps {
  notes: Note[];
  onRefresh?: () => Promise<void>;
  serverSide?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onSearch?: (term: string) => void;

  toggleSort: (key: keyof Note) => void;
  sortField: keyof Note;
  sortOrder: SortOrder;

  isPageLoading?: boolean;
}

export default function NotesTable({
  notes,
  onRefresh,
  serverSide = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize = 5,
  onPageSizeChange,
  onSearch,
  toggleSort,
  sortField,
  sortOrder,
  isPageLoading = false,
}: NotesTableProps) {
  const { TEXT } = useI18n();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editNote, setEditNote] = React.useState<Note | null>(null);
  const [deleteNote, setDeleteNote] = React.useState<Note | null>(null);
  const [showNote, setShowNote] = React.useState<Note | null>(null);

  // Estado para agrupar acciones (igual que en properties-table)
  const [isActionsGrouped, setIsActionsGrouped] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("notes-table-actions-grouped");
      return saved ? JSON.parse(saved) as boolean : true;
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("notes-table-actions-grouped", JSON.stringify(isActionsGrouped));
    } catch {
      // noop
    }
  }, [isActionsGrouped]);

  // Safe text getter (sin usar any)
  function getText(path: string, fallback?: string) {
    const parts = path.split(".");
    let val: unknown = TEXT as unknown;
    for (const p of parts) {
      if (typeof val === "object" && val !== null && p in (val as Record<string, unknown>)) {
        val = (val as Record<string, unknown>)[p];
      } else {
        return fallback ?? path;
      }
    }
    return typeof val === "string" ? val : fallback ?? path;
  }

  const columns: Column<Note>[] = [
    {
      key: "name",
      label: getText("services.fields.name", "Name"),
      sortable: true,
      render: (n) => <span className="font-medium">{n.name}</span>,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-2 text-sm",
    },
    {
      key: "description",
      label: getText("services.fields.description", "Description"),
      sortable: false,
      render: (n) => <TruncatedText text={n.description} maxLength={80} />,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-2 text-sm",
    },
    {
      key: "amount",
      label: getText("services.fields.rate", "Amount"),
      sortable: true,
      render: (n) => <span>{n.amount !== null ? String(n.amount) : n.amount_raw ?? "-"}</span>,
      headerClassName: "px-2 py-1 text-sm text-right",
      cellClassName: "px-2 py-2 text-sm text-right",
    },
    {
      key: "client",
      label: getText("clients.table.headers.clientName", "Client"),
      sortable: false,
      render: (n) => <span>{n.client ?? "-"}</span>,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-2 text-sm",
    },
    {
      key: "property_obj",
      label: getText("properties.table.headers.name", "Property"),
      sortable: false,
      render: (n) => <span>{n.property_obj ?? "-"}</span>,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-2 text-sm",
    },
    {
      key: "created_at",
      label: getText("services.fields.createdAt", "Created"),
      sortable: true,
      render: (n) => <span className="text-sm">{n.created_at ?? "-"}</span>,
      headerClassName: "px-2 py-1 text-sm",
      cellClassName: "px-2 py-2 text-sm",
    },
  ];

  // Acciones agrupadas (dropdown)
  const renderGroupedActions = (noteItem: Note) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setShowNote(noteItem);
          }}
        >
          <Eye className="h-4 w-4 mr-2" />
          {getText("actions.view", "View")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setEditNote(noteItem);
          }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {getText("actions.edit", "Edit")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setDeleteNote(noteItem);
          }}
        >
          <Trash className="h-4 w-4 mr-2" />
          {getText("actions.delete", "Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Acciones separadas (botones)
  const renderActions = (noteItem: Note) => (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setShowNote(noteItem);
        }}
        aria-label={getText("actions.show", "Show")}
        title={getText("actions.show", "Show")}
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setEditNote(noteItem);
        }}
        aria-label={getText("actions.edit", "Edit")}
        title={getText("actions.edit", "Edit")}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteNote(noteItem);
        }}
        aria-label={getText("actions.delete", "Delete")}
        title={getText("actions.delete", "Delete")}
      >
        <Trash className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );

  const addButton = (
    <Button
      variant="default"
      size="sm"
      onClick={() => setCreateOpen(true)}
      className="flex items-center gap-2"
    >
      <Plus className="h-4 w-4" />
      {getText("actions.add", "Add")}
    </Button>
  );

  return (
    <>
      <ReusableTable<Note>
        className="text-sm"
        data={notes}
        columns={columns}
        getItemId={(n) => n.id}
        onSelectItem={(id) => {
          const found = notes.find((x) => x.id === Number(id));
          if (found) setShowNote(found);
        }}
        title={getText("menu.notes", "Notes")}
        searchPlaceholder={getText("table.searchPlaceholder", "Search...")}
        addButtonText={getText("actions.add", "Add")}
        onAddClick={() => setCreateOpen(true)}
        serverSide={serverSide}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        onSearch={onSearch}
        // searchFields necesita keys válidos de Note
        searchFields={["name", "description"] as (keyof Note)[]}
        sortField={sortField}
        sortOrder={sortOrder}
        toggleSort={toggleSort}
        // actions: dependiendo del modo, renderizamos agrupadas o separadas
        actions={(item) => (isActionsGrouped ? renderGroupedActions(item) : renderActions(item))}
        isPageLoading={isPageLoading}
        rightControls={
          <div className="flex items-center gap-2">
            {addButton}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActionsGrouped((s) => !s)}
              className="text-xs"
            >
              {isActionsGrouped ? getText("notes.actions.compact", "Compact") : getText("notes.actions.expanded", "Expanded")}
            </Button>
          </div>
        }
      />

      {/* Dialogs */}
      <CreateNoteDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />

      {editNote && (
        <EditNoteDialog
          note={editNote}
          open={!!editNote}
          onClose={() => setEditNote(null)}
          onUpdated={onRefresh}
        />
      )}

      {deleteNote && (
        <DeleteNoteDialog
          note={deleteNote}
          open={!!deleteNote}
          onClose={() => setDeleteNote(null)}
          onDeleted={onRefresh}
        />
      )}

      {showNote && <ShowNoteDialog note={showNote} open={!!showNote} onClose={() => setShowNote(null)} />}
    </>
  );
}
