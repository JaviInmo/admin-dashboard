"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { UI_TEXT } from "@/config/ui-text"
import { DASHBOARD_CONFIG } from "@/config/ui-dashboard"

export function DashboardGroupedChart() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{UI_TEXT.dashboard.chartCostsTitle}</h3>
      <ResponsiveContainer width="100%" height={DASHBOARD_CONFIG.costsChart.height}>
        <BarChart data={[...DASHBOARD_CONFIG.costsChart.data]} barSize={DASHBOARD_CONFIG.costsChart.barSize}>
          <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_CONFIG.costsChart.gridStroke} />
          <XAxis dataKey="name" tick={{ fontSize: DASHBOARD_CONFIG.costsChart.tickFontSize }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: DASHBOARD_CONFIG.costsChart.tickFontSize }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          />
          <Legend />

          {/* Precio Total */}
          <Bar
            dataKey="precio"
            name={UI_TEXT.dashboard.series.priceTotal}
            fill={DASHBOARD_CONFIG.costsChart.fills.precio}
            radius={[4, 4, 0, 0]}
            animationDuration={DASHBOARD_CONFIG.costsChart.animationDuration}
          />

          {/* Costo Gasolina */}
          <Bar
            dataKey="gasolina"
            name={UI_TEXT.dashboard.series.fuelCost}
            fill={DASHBOARD_CONFIG.costsChart.fills.gasolina}
            radius={[4, 4, 0, 0]}
            animationDuration={DASHBOARD_CONFIG.costsChart.animationDuration}
          />

          {/* Salarios Guardia */}
          <Bar
            dataKey="salario"
            name={UI_TEXT.dashboard.series.guardSalary}
            fill={DASHBOARD_CONFIG.costsChart.fills.salario}
            radius={[4, 4, 0, 0]}
            animationDuration={DASHBOARD_CONFIG.costsChart.animationDuration}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
