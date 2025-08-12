"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { UI_TEXT } from "@/config/ui-text"
import { DASHBOARD_CONFIG } from "@/config/ui-dashboard"

export function DashboardChart() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{UI_TEXT.dashboard.chartHoursTitle}</h3>
      <ResponsiveContainer width="100%" height={DASHBOARD_CONFIG.hoursChart.height}>
        <BarChart data={[...DASHBOARD_CONFIG.hoursChart.data]} barSize={DASHBOARD_CONFIG.hoursChart.barSize}>
          <defs>
            <linearGradient id={DASHBOARD_CONFIG.hoursChart.gradient.id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DASHBOARD_CONFIG.hoursChart.gradient.start} stopOpacity={DASHBOARD_CONFIG.hoursChart.gradient.startOpacity} />
              <stop offset="100%" stopColor={DASHBOARD_CONFIG.hoursChart.gradient.end} stopOpacity={DASHBOARD_CONFIG.hoursChart.gradient.endOpacity} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={DASHBOARD_CONFIG.hoursChart.gridStroke} />
          <XAxis dataKey="name" tick={{ fontSize: DASHBOARD_CONFIG.hoursChart.tickFontSize }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: DASHBOARD_CONFIG.hoursChart.tickFontSize }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          />
          <Legend />
          <Bar
            dataKey="horas"
            fill={`url(#${DASHBOARD_CONFIG.hoursChart.gradient.id})`}
            radius={[8, 8, 0, 0]}
            animationDuration={DASHBOARD_CONFIG.hoursChart.animationDuration}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
