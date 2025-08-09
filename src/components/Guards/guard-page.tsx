"use client"

import * as React from "react"
import GuardsTable from "./GuardsTable"
import GuardShiftsTable from "./GuardShiftsTable"

export default function UsersContent() {
  const [selectedGuardId, setSelectedGuardId] = React.useState<number | null>(null)

  // Datos de ejemplo
  const guards = [
 { id: 1, name: "Carlos López", price: 15, hours: 40 },
  { id: 2, name: "María Pérez", price: 18, hours: 35 },
  { id: 3, name: "José Ramírez", price: 20, hours: 42 },
  { id: 4, name: "Ana Torres", price: 16, hours: 38 },
  { id: 5, name: "Pedro González", price: 17, hours: 45 },
  ]

  const shiftsData: Record<number, any[]> = {
    1: [
      { id: 1, status: "pendiente", location: "Oficina Central", date: "2025-08-10" },
      { id: 2, status: "hecho", location: "Almacén Norte", date: "2025-08-05" },
    ],
    2: [
      { id: 3, status: "cancelado", location: "Planta Sur", date: "2025-08-02" },
    ],
  }

  const selectedGuard = guards.find((g) => g.id === selectedGuardId)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Guardias</h2>

      <GuardsTable guards={guards} onSelectGuard={setSelectedGuardId} />

      {selectedGuard && (
        <GuardShiftsTable
          shifts={shiftsData[selectedGuard.id] || []}
          guardName={selectedGuard.name}
        />
      )}
    </div>
  )
}
