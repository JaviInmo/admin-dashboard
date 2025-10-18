"use client"

import { Button } from "@/components/ui/button"
import { Play, Save, Pencil, Trash2, Eye } from "lucide-react"
import type { Report } from "./types"

interface ReportCardProps {
  report: Report
  onRun: (report: Report) => void
  onSave: (report: Report) => void
  onEdit: (report: Report) => void
  onDelete: (report: Report) => void
  onView: (report: Report) => void
}

export function ReportCard({ report, onRun, onSave, onEdit, onDelete, onView }: ReportCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Nombre */}
        <div className="min-w-[200px] flex-shrink-0">
          <p className="font-semibold text-sm">{report.nombre}</p>
        </div>

        {/* Descripción */}
        <div className="flex-1 min-w-[250px]">
          <p className="text-sm text-muted-foreground line-clamp-1">{report.descripcion}</p>
        </div>

        {/* Fecha Inicio */}
        <div className="min-w-[110px] flex-shrink-0">
          <p className="text-xs text-muted-foreground">Inicio</p>
          <p className="text-sm font-medium">{new Date(report.fechaInicio).toLocaleDateString()}</p>
        </div>

        {/* Fecha Fin */}
        <div className="min-w-[110px] flex-shrink-0">
          <p className="text-xs text-muted-foreground">Fin</p>
          <p className="text-sm font-medium">{new Date(report.fechaFin).toLocaleDateString()}</p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="default" onClick={() => onRun(report)} className="h-8 px-3">
            <Play className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onView(report)} className="h-8 px-3">
            <Eye className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(report)} className="h-8 px-3">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSave(report)} className="h-8 px-3">
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(report)} className="h-8 px-3">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
