"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Report } from "./types"

interface DeleteReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: Report | null
  onConfirm: () => void
}

export function DeleteReportDialog({ open, onOpenChange, report, onConfirm }: DeleteReportDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desea eliminar el reporte?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El reporte <span className="font-semibold">{report?.nombre}</span> será
            eliminado permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Aceptar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
