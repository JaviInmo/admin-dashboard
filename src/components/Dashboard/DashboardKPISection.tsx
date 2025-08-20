"use client"

import { useQuery } from "@tanstack/react-query"
import { DashboardCard } from "./DashboardCard"
import { getDashboardStats, DASHBOARD_KEY } from "@/lib/services/dashboard"

export function DashboardKPISection() {
  const { data: stats, isLoading } = useQuery({
    queryKey: [DASHBOARD_KEY, 'stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000, // Actualizar cada 30 segundos
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const kpis = [
    {
      key: 'clients',
      title: 'Clientes',
      value: stats?.totalClients || 0,
      description: `${stats?.activeClients || 0} activos`,
    },
    {
      key: 'properties',
      title: 'Propiedades',
      value: stats?.totalProperties || 0,
      description: 'Registradas en total',
    },
    {
      key: 'guards',
      title: 'Guardias',
      value: stats?.totalGuards || 0,
      description: 'En servicio',
    },
    {
      key: 'revenue',
      title: 'Ingresos Mensuales',
      value: `$${stats?.monthlyRevenue?.toLocaleString() || '0'}`,
      description: 'Estimado actual',
    },
    {
      key: 'fuel',
      title: 'Costo Combustible',
      value: `$${stats?.monthlyFuelCosts?.toLocaleString() || '0'}`,
      description: 'Este mes',
    },
    {
      key: 'salaries',
      title: 'Salarios Guardias',
      value: `$${stats?.monthlyGuardSalaries?.toLocaleString() || '0'}`,
      description: 'Proyectados',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi) => (
        <DashboardCard 
          key={kpi.key} 
          title={kpi.title} 
          value={kpi.value} 
          description={kpi.description} 
        />
      ))}
    </div>
  )
}
