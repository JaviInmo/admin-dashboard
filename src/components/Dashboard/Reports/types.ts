export interface Report {
  id: string
  nombre: string
  key: string
  descripcion: string
  fechaInicio: string
  fechaFin: string
  datosMapeo: Record<string, any>
}

export interface ReportFormData {
  nombre: string
  key: string
  descripcion: string
  fechaInicio: string
  fechaFin: string
  datosMapeo: Record<string, any>
}
