"use client"

import { DashboardCard } from "./DashboardCard"

export function DashboardKPISection() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <DashboardCard title="Clientes" value={24} description="Activos este mes" />
      <DashboardCard title="Propiedades" value={58} description="Registradas en total" />
      <DashboardCard title="Guardias" value={15} description="En servicio" />
      <DashboardCard title="Horas trabajadas" value="320h" description="En el mes actual" />
      <DashboardCard title="Costo Gasolina" value="$450" description="Este mes" />
      <DashboardCard title="Salarios de Guardia" value="$12,000" description="Proyectados" />
    </div>
  )
}
