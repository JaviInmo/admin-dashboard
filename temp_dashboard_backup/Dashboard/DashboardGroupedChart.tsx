"use client"

import { useQuery } from "@tanstack/react-query"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { useI18n } from "@/i18n"
import { getMonthlyData, DASHBOARD_KEY } from "@/lib/services/dashboard"

export function DashboardGroupedChart() {
  const { TEXT } = useI18n()
  
  const { data: monthlyData, isLoading } = useQuery({
    queryKey: [DASHBOARD_KEY, 'monthly'],
    queryFn: getMonthlyData,
    refetchInterval: 60000, // Actualizar cada minuto
  })

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">{TEXT.dashboard.chartCostsTitle}</h3>
        <div className="h-80 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{TEXT.dashboard.chartCostsTitle}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={monthlyData || []} barSize={30}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
            formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
          />
          <Legend />

          {/* Ingresos */}
          <Bar
            dataKey="revenue"
            name={TEXT.dashboard.series.priceTotal}
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />

          {/* Costo Combustible */}
          <Bar
            dataKey="fuelCosts"
            name={TEXT.dashboard.series.fuelCost}
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />

          {/* Salarios Guardias */}
          <Bar
            dataKey="guardSalaries"
            name={TEXT.dashboard.series.guardSalary}
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
