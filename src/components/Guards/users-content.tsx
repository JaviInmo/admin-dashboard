"use client"

import * as React from "react"
import GuardsTable from "./guardstable"
import GuardShiftsTable from "./guardshiftstable"

export default function UsersContent() {
  const [selectedGuardId, setSelectedGuardId] = React.useState<number | null>(null)

  // Datos de ejemplo
  const guards = [
    { id: 1, name: "Juan Pérez", price: 10 },
    { id: 2, name: "Pedro Gómez", price: 12 },
    { id: 3, name: "Luis Ramírez", price: 9 },
    { id: 4, name: "Carlos López", price: 11 },
    { id: 5, name: "Andrés Torres", price: 13 },
    { id: 6, name: "Mario Ruiz", price: 8 },
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
