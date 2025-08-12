"use client"

import * as React from "react"
import GuardsTable from "./GuardsTable"
import GuardShiftsTable from "./GuardShiftsTable"
import { UI_TEXT } from "@/config/ui-text"
import { MAX_WEEKLY_HOURS } from "@/config/business-rules"

type Shift = {
  id: number
  status: "pendiente" | "hecho" | "cancelado"
  hours: number
  date: string // ISO o mostrar-friendly
  location: string
  pricePerHour: number
}

// Máximo semanal definido por reglas de negocio

export default function GuardsContent() {
  const [selectedGuardId, setSelectedGuardId] = React.useState<number | null>(null)

  // Guardias base (sin cálculos)
  const baseGuards = [
    { id: 1, name: "Carlos López" },
    { id: 2, name: "María Pérez" },
    { id: 3, name: "José Ramírez" },
    { id: 4, name: "Ana Torres" },
    { id: 5, name: "Pedro González" },
  ]

  // Shift data estática por guardia (incluye horas y pricePerHour)
  const shiftsData: Record<number, Shift[]> = {
    1: [
      { id: 11, status: "pendiente", hours: 8, date: "2025-08-10", location: "Oficina Central", pricePerHour: 15 },
      { id: 12, status: "hecho", hours: 6, date: "2025-08-05", location: "Almacén Norte", pricePerHour: 12 },
      { id: 13, status: "hecho", hours: 10, date: "2025-08-07", location: "Centro Comercial", pricePerHour: 16 },
    ],
    2: [
      { id: 21, status: "cancelado", hours: 5, date: "2025-08-02", location: "Planta Sur", pricePerHour: 18 },
      { id: 22, status: "hecho", hours: 7, date: "2025-08-06", location: "Edificio A", pricePerHour: 17 },
    ],
    3: [
      { id: 31, status: "hecho", hours: 12, date: "2025-08-03", location: "Hospital General", pricePerHour: 20 },
      { id: 32, status: "pendiente", hours: 15, date: "2025-08-09", location: "Centro Logístico", pricePerHour: 14 },
    ],
    4: [
      // Sin turnos -> demostración de guardia con 0 horas
    ],
    5: [
      { id: 51, status: "hecho", hours: 20, date: "2025-08-01", location: "Plaza Oeste", pricePerHour: 17 },
      { id: 52, status: "hecho", hours: 26, date: "2025-08-04", location: "Residencial Norte", pricePerHour: 17 },
      // Ejemplo excedente (46 horas totales) para probar límite
    ],
  }

  // Agregamos totalHours y totalSalary para la tabla de guardias
  const guards = baseGuards.map((g) => {
    const shifts = shiftsData[g.id] ?? []
    const totalHours = shifts.reduce((acc, s) => acc + s.hours, 0)
    const totalSalary = shifts.reduce((acc, s) => acc + s.hours * s.pricePerHour, 0)
    // Si quieres forzar un máximo, aquí podrías truncar/capear totalHours o marcarlo.
    if (totalHours > MAX_WEEKLY_HOURS) {
      console.warn(`Guardia ${g.name} (${g.id}) supera el máximo semanal de horas: ${totalHours} > ${MAX_WEEKLY_HOURS}`)
    }
    return {
      id: g.id,
      name: g.name,
      totalHours,
      totalSalary: Number(totalSalary.toFixed(2)),
    }
  })

  const selectedGuardShifts = (selectedGuardId && shiftsData[selectedGuardId]) ? shiftsData[selectedGuardId] : []

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{UI_TEXT.guards.title}</h2>
      <p className="text-sm text-muted-foreground">
        {UI_TEXT.guards.weeklyMaxNote.replace("{hours}", String(MAX_WEEKLY_HOURS))}
      </p>

      <GuardsTable guards={guards} onSelectGuard={setSelectedGuardId} />

      {selectedGuardId ? (
        <GuardShiftsTable
          shifts={selectedGuardShifts}
          guardName={guards.find((g) => g.id === selectedGuardId)?.name ?? "—"}
        />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">{UI_TEXT.guards.selectPrompt}</p>
        </div>
      )}
    </div>
  )
}
