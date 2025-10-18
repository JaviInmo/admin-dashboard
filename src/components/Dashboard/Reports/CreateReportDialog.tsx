"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Report, ReportFormData } from "./types"

interface CreateReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: ReportFormData) => void
  editingReport?: Report | null
}

export function CreateReportDialog({ open, onOpenChange, onSave, editingReport }: CreateReportDialogProps) {
  const [formData, setFormData] = useState<ReportFormData>({
    nombre: "",
    key: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    datosMapeo: {},
  })

  const [mapeoJson, setMapeoJson] = useState("{}")
  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (editingReport) {
      setFormData({
        nombre: editingReport.nombre,
        key: editingReport.key,
        descripcion: editingReport.descripcion,
        fechaInicio: editingReport.fechaInicio,
        fechaFin: editingReport.fechaFin,
        datosMapeo: editingReport.datosMapeo,
      })
      setMapeoJson(JSON.stringify(editingReport.datosMapeo, null, 2))
    } else {
      setFormData({
        nombre: "",
        key: "",
        descripcion: "",
        fechaInicio: "",
        fechaFin: "",
        datosMapeo: {},
      })
      setMapeoJson("{}")
    }
    setJsonError(null)
  }, [editingReport, open])

  const handleMapeoChange = (value: string) => {
    setMapeoJson(value)
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch (error) {
      setJsonError("JSON inválido")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const parsedMapeo = JSON.parse(mapeoJson)
      onSave({ ...formData, datosMapeo: parsedMapeo })
      onOpenChange(false)
    } catch (error) {
      setJsonError("Error: El mapeo de datos debe ser un JSON válido")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingReport ? "Editar Reporte" : "Crear Nuevo Reporte"}</DialogTitle>
          <DialogDescription>
            {editingReport ? "Modifica los campos del reporte" : "Completa los campos para crear un nuevo reporte"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Primera fila: Nombre y Key */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Reporte de Ventas"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="Ej: ventas_mensual"
                required
              />
            </div>
          </div>

          {/* Segunda fila: Fecha Inicio y Fecha Fin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Tercera fila: Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              placeholder="Describe el propósito del reporte..."
              required
            />
          </div>

          {/* Mapeo de datos */}
          <div className="space-y-2">
            <Label htmlFor="datosMapeo">Mapeo de Datos (JSON)</Label>
            <Textarea
              id="datosMapeo"
              value={mapeoJson}
              onChange={(e) => handleMapeoChange(e.target.value)}
              rows={10}
              className={`font-mono text-sm ${jsonError ? "border-red-500" : ""}`}
              placeholder='{"campo1": "valor1", "campo2": "valor2"}'
            />
            {jsonError ? (
              <p className="text-xs text-red-500">{jsonError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ingresa el mapeo de datos en formato JSON para enviar al backend
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!!jsonError}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
