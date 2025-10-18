"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { ReportCard } from "./ReportCard"
import { CreateReportDialog } from "./CreateReportDialog"
import { ViewReportDialog } from "./ViewReportDialog"
import { DeleteReportDialog } from "./DeleteReportDialog"
import type { Report, ReportFormData } from "./types"

// Datos estáticos de ejemplo
const INITIAL_REPORTS: Report[] = [
  {
    id: "1",
    nombre: "Reporte de Ventas Mensual",
    key: "ventas_mensual",
    descripcion: "Reporte consolidado de todas las ventas del mes actual",
    fechaInicio: "2025-01-01",
    fechaFin: "2025-01-31",
    datosMapeo: {
      tipo: "ventas",
      periodo: "mensual",
      incluirImpuestos: true,
    },
  },
  {
    id: "2",
    nombre: "Análisis de Clientes",
    key: "analisis_clientes",
    descripcion: "Reporte detallado del comportamiento de clientes",
    fechaInicio: "2025-01-01",
    fechaFin: "2025-03-31",
    datosMapeo: {
      tipo: "clientes",
      metricas: ["compras", "frecuencia", "valor_promedio"],
    },
  },
  {
    id: "3",
    nombre: "Inventario Trimestral",
    key: "inventario_q1",
    descripcion: "Estado del inventario para el primer trimestre",
    fechaInicio: "2025-01-01",
    fechaFin: "2025-03-31",
    datosMapeo: {
      tipo: "inventario",
      categorias: ["productos", "materias_primas"],
      incluirValoracion: true,
    },
  },
]

export function ReportsTab() {
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS)
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [editingReport, setEditingReport] = useState<Report | null>(null)

  const filteredReports = reports.filter(
    (report) =>
      report.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.descripcion.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleCreateReport = (data: ReportFormData) => {
    const newReport: Report = {
      id: Date.now().toString(),
      ...data,
    }
    setReports([...reports, newReport])
  }

  const handleEditReport = (data: ReportFormData) => {
    if (!editingReport) return
    setReports(reports.map((report) => (report.id === editingReport.id ? { ...report, ...data } : report)))
    setEditingReport(null)
  }

  const handleDeleteReport = () => {
    if (!selectedReport) return
    setReports(reports.filter((report) => report.id !== selectedReport.id))
    setDeleteDialogOpen(false)
    setSelectedReport(null)
  }

  const handleRun = (report: Report) => {
    console.log("Ejecutando reporte:", report)
    alert(`Ejecutando reporte: ${report.nombre}`)
  }

  const handleSave = (report: Report) => {
    console.log("Guardando reporte:", report)
    alert(`Reporte guardado: ${report.nombre}`)
  }

  const handleEdit = (report: Report) => {
    setEditingReport(report)
    setCreateDialogOpen(true)
  }

  const handleDelete = (report: Report) => {
    setSelectedReport(report)
    setDeleteDialogOpen(true)
  }

  const handleView = (report: Report) => {
    setSelectedReport(report)
    setViewDialogOpen(true)
  }

  return (
    <div className="border rounded-lg p-6 h-[calc(100vh-12rem)] flex flex-col">
      {/* Header con búsqueda y botón de crear */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar reportes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => {
            setEditingReport(null)
            setCreateDialogOpen(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Reporte
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onRun={handleRun}
              onSave={handleSave}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">No se encontraron reportes</div>
        )}
      </div>

      {/* Dialogs */}
      <CreateReportDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={editingReport ? handleEditReport : handleCreateReport}
        editingReport={editingReport}
      />

      <ViewReportDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} report={selectedReport} />

      <DeleteReportDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        report={selectedReport}
        onConfirm={handleDeleteReport}
      />
    </div>
  )
}
