"use client"

import React from "react"
import ClientsTable from "./clients-table"
import ClientPropertiesTable from "./client-properties-table"

export default function ClientPage() {
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null)

  // Datos de propiedades por cliente (ejemplo lógico)
  const propertiesData: Record<number, any[]> = {
    1: [
      { id: 1, name: "Oficina Central", price: 200, hours: 160, fuelCost: 50 },
      { id: 2, name: "Sucursal Norte", price: 180, hours: 140, fuelCost: 40 },
    ],
    2: [
      { id: 3, name: "Bodega Sur", price: 150, hours: 120, fuelCost: 35 },
      { id: 4, name: "Sucursal Este", price: 170, hours: 130, fuelCost: 45 },
    ],
    3: [
      { id: 5, name: "Planta Industrial", price: 300, hours: 200, fuelCost: 80 },
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
    return {
      ...client,
      propertyCount: props.length,
      totalPrice,
    }
  })

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Clientes</h2>

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
