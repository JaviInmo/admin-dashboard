"use client"

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"

const data = [
  { name: "Ene", precio: 1000, gasolina: 450, salario: 500 },
  { name: "Feb", precio: 1200, gasolina: 480, salario: 520 },
  { name: "Mar", precio: 900, gasolina: 400, salario: 480 },
  { name: "Abr", precio: 1100, gasolina: 470, salario: 510 },
]

export function DashboardGroupedChart() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Costos por mes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barSize={30}>
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

          {/* Precio Total */}
          <Bar
            dataKey="precio"
            name="Precio Total"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />

          {/* Costo Gasolina */}
          <Bar
            dataKey="gasolina"
            name="Costo Gasolina"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />

          {/* Salarios Guardia */}
          <Bar
            dataKey="salario"
            name="Salario Guardia"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
