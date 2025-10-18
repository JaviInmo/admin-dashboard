import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { Report } from "./types"

interface ViewReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: Report | null
}

export function ViewReportDialog({ open, onOpenChange, report }: ViewReportDialogProps) {
  if (!report) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ver Reporte</DialogTitle>
          <DialogDescription>Detalles del reporte (solo lectura)</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Primera fila: Nombre y Key */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <div className="p-3 bg-muted rounded-md">{report.nombre}</div>
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <div className="p-3 bg-muted rounded-md">{report.key}</div>
            </div>
          </div>

          {/* Segunda fila: Fecha Inicio y Fecha Fin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <div className="p-3 bg-muted rounded-md">{new Date(report.fechaInicio).toLocaleDateString()}</div>
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <div className="p-3 bg-muted rounded-md">{new Date(report.fechaFin).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Tercera fila: Descripción */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">{report.descripcion}</div>
          </div>

          {/* Mapeo de datos */}
          <div className="space-y-2">
            <Label>Mapeo de Datos</Label>
            <div className="p-3 bg-muted rounded-md">
              <pre className="font-mono text-sm overflow-x-auto">{JSON.stringify(report.datosMapeo, null, 2)}</pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
