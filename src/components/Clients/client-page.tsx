"use client"

import React from "react"
import ClientsTable from "./clients-table"
import ClientPropertiesTable from "./client-properties-table"
import { UI_TEXT } from "@/config/ui-text"

export default function ClientPage() {
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null)

  // Datos de propiedades por cliente (incluye gastos)
  const propertiesData: Record<number, any[]> = {
    1: [
      { id: 1, name: "Oficina Central", price: 500, hours: 160, fuelCost: 50, expenses: 160 },
      { id: 2, name: "Sucursal Norte", price: 300, hours: 140, fuelCost: 40, expenses: 150 },
    ],
    2: [
      { id: 3, name: "Bodega Sur", price: 460, hours: 120, fuelCost: 35, expenses: 120 },
      { id: 4, name: "Sucursal Este", price: 525, hours: 130, fuelCost: 45, expenses: 140 },
    ],
    3: [
      { id: 5, name: "Planta Industrial", price: 364, hours: 200, fuelCost: 80, expenses: 250 },
    ],
  }

  // Lista de clientes con cálculos
  const clients = [
    { id: 1, name: "Empresa Alfa" },
    { id: 2, name: "Supermercado Beta" },
    { id: 3, name: "Construcciones Gamma" },
  ].map(client => {
    const props = propertiesData[client.id] || []
    const totalPrice = props.reduce((sum, p) => sum + p.price, 0)
    const totalFuel = props.reduce((sum, p) => sum + p.fuelCost, 0)
    const totalExpenses = props.reduce((sum, p) => sum + p.expenses, 0)
    return {
      ...client,
      propertyCount: props.length,
      totalPrice,
      totalFuel,
      totalExpenses,
    }
  })

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{UI_TEXT.clients.title}</h2>

      <ClientsTable
        clients={clients}
        onSelectClient={setSelectedClientId}
      />

      {selectedClient && (
        <ClientPropertiesTable
          properties={propertiesData[selectedClient.id] || []}
          clientName={selectedClient.name}
        />
      )}
    </div>
  )
}
