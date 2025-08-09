"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const upcomingShifts = [
  { guard: "Juan Pérez", location: "Zona Norte", date: "2025-08-09" },
  { guard: "Luis García", location: "Zona Sur", date: "2025-08-10" },
]

export function DashboardTable() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-lg font-semibold">Próximos turnos</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guardia</TableHead>
            <TableHead>Lugar</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {upcomingShifts.map((shift, i) => (
            <TableRow key={i}>
              <TableCell>{shift.guard}</TableCell>
              <TableCell>{shift.location}</TableCell>
              <TableCell>{shift.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
