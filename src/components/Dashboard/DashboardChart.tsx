"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

const data = [
  { name: "Ene", horas: 120 },
  { name: "Feb", horas: 140 },
  { name: "Mar", horas: 110 },
  { name: "Abr", horas: 150 },
]

export function DashboardChart() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Horas trabajadas por mes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barSize={50}>
          <defs>
            <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
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
            fill="url(#colorHoras)"
            radius={[8, 8, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
