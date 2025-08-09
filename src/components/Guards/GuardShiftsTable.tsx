"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Shift {
  id: number
  status: "pendiente" | "hecho" | "cancelado"
  location: string
  date: string
}

interface GuardShiftsTableProps {
  shifts: Shift[]
  guardName: string
}

const statusColors: Record<Shift["status"], string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  hecho: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
}

export default function GuardShiftsTable({ shifts, guardName }: GuardShiftsTableProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Turnos de {guardName}
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead>Lugar</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell>
                <Badge className={statusColors[shift.status]}>
                  {shift.status}
                </Badge>
              </TableCell>
              <TableCell>{shift.location}</TableCell>
              <TableCell>{shift.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
